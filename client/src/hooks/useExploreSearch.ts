import { useState, useEffect } from 'react';
import { searchApi, type SearchResults } from '../services/api';

export const useExploreSearch = (initialQuery: string = '') => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResults>({
        posts: [],
        communities: [],
        users: []
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults({ posts: [], communities: [], users: [] });
            setLoading(false);
            return;
        }

        setLoading(true);
        const timeoutId = setTimeout(async () => {
            try {
                const data = await searchApi.searchAll(query);
                setResults(data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    return {
        query,
        setQuery,
        results,
        loading
    };
};
