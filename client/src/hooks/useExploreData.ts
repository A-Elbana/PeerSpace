import { useState, useEffect, useCallback } from 'react';
import api, { communityApi, assignmentApi, submissionApi, type CommunityResponse } from '../services/api';

export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
    avatar_file_id?: string;
}

export interface CommunityWithMeta extends CommunityResponse {
    memberCount?: number;
    postCount?: number;
}

const COMMUNITIES_PER_PAGE = 5;

export const useExploreData = () => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [communities, setCommunities] = useState<CommunityWithMeta[]>([]);
    const [privateCommunities, setPrivateCommunities] = useState<CommunityWithMeta[]>([]);
    const [enrolledCommunityIds, setEnrolledCommunityIds] = useState<Set<string>>(new Set());

    const [publicPage, setPublicPage] = useState(1);
    const [privatePage, setPrivatePage] = useState(1);
    const [publicMeta, setPublicMeta] = useState<any>(null);
    const [privateMeta, setPrivateMeta] = useState<any>(null);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);
    const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);

    const [deadlines, setDeadlines] = useState<any[]>([]);
    const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);

    const fetchInitialData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Step 1: Core core data (User and Communities)
            const [userRes, publicRes, privateRes, myCommRes] = await Promise.allSettled([
                api.get('/auth/me'),
                communityApi.getAll({ type: 'PUBLIC', limit: COMMUNITIES_PER_PAGE, page: 1 }),
                communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page: 1 }),
                communityApi.getMyCommunities()
            ]);

            let normalizedUser: UserData | null = null;
            if (userRes.status === 'fulfilled') {
                const { data } = userRes.value;
                normalizedUser = {
                    ...data,
                    role: data.role?.toLowerCase() as UserRole
                };
                setUser(normalizedUser);
            } else {
                throw new Error('Failed to fetch user data');
            }

            if (publicRes.status === 'fulfilled') {
                setCommunities(publicRes.value.data);
                setPublicMeta(publicRes.value.meta || null);
            }

            if (privateRes.status === 'fulfilled') {
                setPrivateCommunities(privateRes.value.data);
                setPrivateMeta(privateRes.value.meta || null);
            }

            const enrolledIds = new Set<string>();
            if (myCommRes.status === 'fulfilled') {
                myCommRes.value.data.forEach((c: any) => enrolledIds.add(c.id));
                setEnrolledCommunityIds(enrolledIds);
            }

            // Step 2: Role-specific data (Incremental update)
            // We set isLoading to false early to allow the Feed to mount
            setIsLoading(false);

            if (normalizedUser) {
                if (normalizedUser.role === 'student') {
                    const [submissionsRes, allAssignmentsRes] = await Promise.allSettled([
                        submissionApi.getMySubmissions({ limit: 100 }),
                        Promise.allSettled((myCommRes.status === 'fulfilled' ? myCommRes.value.data : []).map(async (community: any) => {
                            try {
                                const res = await assignmentApi.getByCommunity(community.id, { limit: 50 });
                                return res.data.map((a: any) => ({ ...a, communityName: community.name }));
                            } catch { return []; }
                        }))
                    ]);

                    let submittedAssignmentIds = new Set<number>();
                    if (submissionsRes.status === 'fulfilled') {
                        submittedAssignmentIds = new Set(submissionsRes.value.data.map((sub: any) => sub.aid));
                    }

                    if (allAssignmentsRes.status === 'fulfilled') {
                        const allAssignments = allAssignmentsRes.value
                            .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
                            .flatMap(r => r.value);

                        const sortedAssignments = allAssignments
                            .filter(a => a.due_date && !submittedAssignmentIds.has(a.id))
                            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                            .slice(0, 3);
                        setDeadlines(sortedAssignments);
                    }
                } else if (normalizedUser.role === 'instructor') {
                    const managedCommunities = (myCommRes.status === 'fulfilled' ? myCommRes.value.data : []);
                    const assignmentsRes = await Promise.allSettled(managedCommunities.map(async (community: any) => {
                        try {
                            const res = await assignmentApi.getByCommunity(community.id, { limit: 50 });
                            return res.data.map((a: any) => ({ ...a, communityName: community.name }));
                        } catch { return []; }
                    }));

                    const allAssignments = assignmentsRes
                        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
                        .flatMap(r => r.value);

                    const assignmentsWithPendingCount = await Promise.all(
                        allAssignments.map(async (assignment: any) => {
                            try {
                                const submissionsResponse = await submissionApi.getByAssignment(assignment.id, { limit: 100 });
                                const ungradedCount = submissionsResponse.data.filter((sub: any) => sub.grade === null).length;
                                return { ...assignment, ungradedCount };
                            } catch {
                                return { ...assignment, ungradedCount: 0 };
                            }
                        })
                    );

                    const pendingAssignments = assignmentsWithPendingCount
                        .filter(a => a.ungradedCount > 0)
                        .sort((a, b) => b.ungradedCount - a.ungradedCount)
                        .slice(0, 3);

                    setPendingSubmissions(pendingAssignments);
                }
            }
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            setIsLoading(false);
            throw error; // Let the component handle major failures (like auth)
        }
    }, []);

    const handlePageChangePublic = async (page: number) => {
        if (isLoadingPublic) return;
        setIsLoadingPublic(true);
        try {
            const response = await communityApi.getAll({ type: 'PUBLIC', limit: COMMUNITIES_PER_PAGE, page });
            setCommunities(response.data);
            setPublicPage(page);
            setPublicMeta(response.meta || null);
        } catch (error) {
            console.error('Failed to change public page', error);
        } finally {
            setIsLoadingPublic(false);
        }
    };

    const handlePageChangePrivate = async (page: number) => {
        if (isLoadingPrivate) return;
        setIsLoadingPrivate(true);
        try {
            const response = await communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page });
            setPrivateCommunities(response.data);
            setPrivatePage(page);
            setPrivateMeta(response.meta || null);
        } catch (error) {
            console.error('Failed to change private page', error);
        } finally {
            setIsLoadingPrivate(false);
        }
    };

    useEffect(() => {
        fetchInitialData().catch(() => {
            // Error handling already done in hook or component will catch it
        });
    }, [fetchInitialData]);

    return {
        user,
        communities,
        privateCommunities,
        enrolledCommunityIds,
        setEnrolledCommunityIds,
        isLoading,
        deadlines,
        pendingSubmissions,
        publicPage,
        privatePage,
        publicMeta,
        privateMeta,
        isLoadingPublic,
        isLoadingPrivate,
        handlePageChangePublic,
        handlePageChangePrivate,
        refreshData: fetchInitialData
    };
};
