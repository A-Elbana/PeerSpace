import { useState, useEffect, useCallback } from 'react';
import { studentApi } from '../services/api';

export const useStudentDashboard = (params?: { coursesPage?: number; coursesLimit?: number }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [coursesMeta, setCoursesMeta] = useState<any>(null);
    const [deadlines, setDeadlines] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [profileRes, coursesRes, deadlinesRes, activityRes] = await Promise.allSettled([
                studentApi.getProfile(),
                studentApi.getEnrolledCourses({ page: params?.coursesPage || 1, limit: params?.coursesLimit || 10 }),
                studentApi.getUpcomingDeadlines(),
                studentApi.getRecentActivity({ page: 1, limit: 10 })
            ]);

            // Handle Profile (Critical)
            if (profileRes.status === 'fulfilled') {
                setProfile(profileRes.value);
            } else {
                console.error('Failed to fetch profile:', profileRes.reason);
                setError('Failed to load user profile');
            }

            // Handle Courses
            if (coursesRes.status === 'fulfilled') {
                setCourses(coursesRes.value.data);
                setCoursesMeta(coursesRes.value.meta);
            } else {
                console.error('Failed to fetch courses:', coursesRes.reason);
            }

            // Handle Deadlines
            if (deadlinesRes.status === 'fulfilled') {
                setDeadlines(deadlinesRes.value);
            } else {
                console.error('Failed to fetch deadlines:', deadlinesRes.reason);
            }

            // Handle Activity
            if (activityRes.status === 'fulfilled') {
                setActivity(activityRes.value.data);
            } else {
                console.error('Failed to fetch recent activity:', activityRes.reason);
            }

        } catch (err) {
            console.error('Unified dashboard fetch failed:', err);
            setError('An unexpected error occurred while loading your dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, [params?.coursesPage, params?.coursesLimit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        profile,
        courses,
        coursesMeta,
        deadlines,
        activity,
        isLoading,
        error,
        refresh: fetchData
    };
};
