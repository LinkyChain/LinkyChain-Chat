/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faCheckCircle, faExclamationTriangle, faSpinner, faFire, faBomb } from '@fortawesome/free-solid-svg-icons';
import { io } from 'socket.io-client';

const socket = io();

const LAM = ({ messageId, isLink, initialStatus }) => {
    const [statuses, setStatuses] = useState({
        scan: initialStatus?.scan || 'pending',
        nsfw: 'pending',
        spam: 'pending',
    });

    useEffect(() => {
        const analyzeContentForNsfw = async (content) => {
            console.log(`[${new Date().toISOString()}] Simulating NSFW analysis for content: ${content}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const isNsfw = content.toLowerCase().includes('nsfw');
            const result = isNsfw ? 'nsfw' : 'sfw';
            console.log(`[${new Date().toISOString()}] NSFW analysis complete. Result: ${result}`);
            return result;
        };

        const checkForSpam = async (content) => {
            console.log(`[${new Date().toISOString()}] Simulating spam analysis for content: ${content}`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const isSpam = content.toLowerCase().includes('spam');
            const result = isSpam ? 'spam' : 'clean';
            console.log(`[${new Date().toISOString()}] Spam analysis complete. Result: ${result}`);
            return result;
        };

        if (initialStatus.type === 'text' || initialStatus.type === 'link') {
            const contentToScan = initialStatus.content;

            setStatuses(prev => ({ ...prev, nsfw: 'scanning', spam: 'scanning' }));

            Promise.all([
                analyzeContentForNsfw(contentToScan),
                checkForSpam(contentToScan)
            ]).then(([nsfwResult, spamResult]) => {
                setStatuses(prev => ({
                    ...prev,
                    nsfw: nsfwResult,
                    spam: spamResult
                }));
            }).catch(error => {
                console.error("Error during client-side scan:", error);
                setStatuses(prev => ({ ...prev, nsfw: 'sfw', spam: 'clean' }));
            });
        }
    }, [messageId, initialStatus]);

    useEffect(() => {
        const handleScanResult = (result) => {
            if (result.messageId === messageId) {
                setStatuses(prev => ({ ...prev, scan: result.scanStatus }));
            }
        };
        socket.on('scan result', handleScanResult);
        return () => {
            socket.off('scan result', handleScanResult);
        };
    }, [messageId]);

    const renderContent = () => {
        if (statuses.scan === 'malware') {
            return (
                <span className="tooltip flex items-center text-red-500">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Warning: Malware detected!
                    </span>
                </span>
            );
        }

        if (statuses.nsfw === 'nsfw') {
            return (
                <span className="tooltip flex items-center text-red-500">
                    <FontAwesomeIcon icon={faFire} className="mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Warning: Potentially NSFW content
                    </span>
                </span>
            );
        }

        if (statuses.spam === 'spam') {
            return (
                <span className="tooltip flex items-center text-yellow-500">
                    <FontAwesomeIcon icon={faBomb} className="mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Alert: Potential Spam
                    </span>
                </span>
            );
        }

        if (statuses.scan === 'scanning' || statuses.nsfw === 'scanning' || statuses.spam === 'scanning') {
            return (
                <span className="tooltip flex items-center text-gray-500">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Scanning in progress...
                    </span>
                </span>
            );
        }

        if (statuses.scan === 'clean' && statuses.nsfw === 'sfw' && statuses.spam === 'clean') {
            return (
                <span className="tooltip flex items-center text-green-500">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Content is safe
                    </span>
                </span>
            );
        }

        return (
                <span className="tooltip flex items-center text-green-500">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    <span className="tooltiptext bg-gray-700 text-white text-xs rounded py-1 px-2 pointer-events-none">
                        Content is safe
                    </span>
                </span>
            );
    };

    return (
        <div className="flex items-center text-xs text-gray-400">
            {renderContent()}
        </div>
    );
};

export default LAM;