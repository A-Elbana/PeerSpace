import { useState, useEffect, useCallback } from 'react';
import { instructorApi } from '../services/api';

export const useInstructorDashboard = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [coursesMeta, setCoursesMeta] = useState<any>(null);
    const [pendingGrading, setPendingGrading] = useState<any[]>([]);
    const [pendingGradingMeta, setPendingGradingMeta] = useState<any>(null);
    const [engagement, setEngagement] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [statsRes, coursesRes, gradingRes, engagementRes] = await Promise.allSettled([
                instructorApi.getStats(),
                instructorApi.getActiveCourses({ page: 1, limit: 50 }),
                instructorApi.getPendingGrading({ page: 1, limit: 10 }),
                instructorApi.getEngagementData()
            ]);

            // Handle Stats
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
            } else {
                console.error('Failed to fetch instructor stats:', statsRes.reason);
            }

            // Handle Courses
            if (coursesRes.status === 'fulfilled') {
                setCourses(coursesRes.value.data);
                setCoursesMeta(coursesRes.value.meta);
            } else {
                console.error('Failed to fetch managed communities:', coursesRes.reason);
            }

            // Handle Pending Grading
            if (gradingRes.status === 'fulfilled') {
                setPendingGrading(gradingRes.value.data);
                setPendingGradingMeta(gradingRes.value.meta);
            } else {
                console.error('Failed to fetch pending submissions:', gradingRes.reason);
            }

            // Handle Engagement
            if (engagementRes.status === 'fulfilled') {
                setEngagement(engagementRes.value.data);
            } else {
                console.error('Failed to fetch engagement data:', engagementRes.reason);
            }

        } catch (err) {
            console.error('Unified instructor dashboard fetch failed:', err);
            setError('An unexpected error occurred while loading your dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        stats,
        courses,
        coursesMeta,
        pendingGrading,
        pendingGradingMeta,
        engagement,
        isLoading,
        error,
        refresh: fetchData
    };
};
