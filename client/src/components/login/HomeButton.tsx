import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

interface HomeButtonProps {
    className?: string;
}

const HomeButton: React.FC<HomeButtonProps> = ({ className }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.2, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Go to home"
            className={`fixed top-4 left-4 p-3 rounded-lg bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-300 z-50 hover:-translate-y-1 ${className}`}
        >
            <Home size={24} />
        </motion.button>
    );
};

export default HomeButton;
