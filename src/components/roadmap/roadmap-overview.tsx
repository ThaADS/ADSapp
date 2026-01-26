'use client'

import { useTranslations } from '@/components/providers/translation-provider'
import {
    CheckCircleIcon,
    ClockIcon,
    CalendarIcon,
    SparklesIcon,
    LightBulbIcon,
    RocketLaunchIcon
} from '@heroicons/react/24/outline'

type Status = 'completed' | 'in_progress' | 'planned';
type Category = 'core' | 'ai' | 'integrations' | 'analytics';

interface RoadmapItem {
    id: string;
    quarter: string;
    status: Status;
    category: Category;
    titleKey: string;
    descKey: string;
}

export function RoadmapOverview() {
    const t = useTranslations('roadmap')

    const items: RoadmapItem[] = [
        // Completed
        { id: '1', quarter: 'q4_2025', status: 'completed', category: 'core', titleKey: 'drip_campaigns', descKey: 'drip_campaigns_desc' },
        { id: '2', quarter: 'q4_2025', status: 'completed', category: 'core', titleKey: 'broadcast_campaigns', descKey: 'broadcast_campaigns_desc' },

        // In Progress / Near Term
        { id: '3', quarter: 'q1_2026', status: 'in_progress', category: 'core', titleKey: 'visual_workflow', descKey: 'visual_workflow_desc' },
        { id: '4', quarter: 'q1_2026', status: 'planned', category: 'analytics', titleKey: 'advanced_analytics', descKey: 'advanced_analytics_desc' },

        // Future
        { id: '5', quarter: 'q2_2026', status: 'planned', category: 'integrations', titleKey: 'crm_integrations', descKey: 'crm_integrations_desc' },
        { id: '6', quarter: 'q2_2026', status: 'planned', category: 'core', titleKey: 'whatsapp_widget', descKey: 'whatsapp_widget_desc' },
        { id: '7', quarter: 'future', status: 'planned', category: 'ai', titleKey: 'ai_enhancements', descKey: 'ai_enhancements_desc' },
        { id: '8', quarter: 'future', status: 'planned', category: 'core', titleKey: 'mobile_app', descKey: 'mobile_app_desc' },
    ]

    const getStatusColor = (status: Status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'planned': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    const getStatusIcon = (status: Status) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
            case 'in_progress': return <RocketLaunchIcon className="w-4 h-4" />;
            case 'planned': return <CalendarIcon className="w-4 h-4" />;
        }
    }

    const getCategoryIcon = (category: Category) => {
        switch (category) {
            case 'ai': return <SparklesIcon className="w-5 h-5 text-purple-500" />;
            case 'core': return <RocketLaunchIcon className="w-5 h-5 text-blue-500" />;
            case 'analytics': return <ClockIcon className="w-5 h-5 text-orange-500" />; // ChartBarIcon normally but using Clock for now or import
            default: return <LightBulbIcon className="w-5 h-5 text-yellow-500" />;
        }
    }

    const quarters = ['q4_2025', 'q1_2026', 'q2_2026', 'future'];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
                    <p className="text-blue-100 text-lg mb-8">
                        {t('subtitle')}
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span>{t('status.completed')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                            <RocketLaunchIcon className="w-5 h-5 text-blue-300" />
                            <span>{t('status.in_progress')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                            <CalendarIcon className="w-5 h-5 text-gray-300" />
                            <span>{t('status.planned')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {quarters.map((quarter) => {
                    const quarterItems = items.filter(item => item.quarter === quarter);

                    return (
                        <div key={quarter} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-100">
                                <CalendarIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="font-semibold text-gray-900">{t(`quarters.${quarter}` as any)}</h3>
                                <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                                    {quarterItems.length}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
                                {quarterItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                {getCategoryIcon(item.category)}
                                            </div>
                                            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                                                {getStatusIcon(item.status)}
                                                {t(`status.${item.status}` as any)}
                                            </span>
                                        </div>

                                        <h4 className="font-semibold text-gray-900 mb-1">
                                            {t(`items.${item.titleKey}` as any)}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {t(`items.${item.descKey}` as any)}
                                        </p>
                                    </div>
                                ))}

                                {quarterItems.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                                        <p className="text-sm text-gray-400 italic">No items yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Suggestion Box */}
            <div className="mt-12 bg-gray-50 rounded-xl border border-gray-200 p-8 text-center max-w-2xl mx-auto">
                <LightBulbIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('feedback.title')}</h3>
                <p className="text-gray-600 mb-6">
                    {t('feedback.description')}
                </p>
                <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-lg shadow-sm transition-all hover:shadow">
                    {t('feedback.button')}
                </button>
            </div>
        </div>
    )
}
