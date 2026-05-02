import React from 'react';

type Props = {
    children: React.ReactNode;
};

type State = {
    hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error('App error boundary caught:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
                    <div className="max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                        <h1 className="text-2xl font-black text-gray-900">حدث خلل في الصفحة</h1>
                        <p className="mt-3 text-sm leading-7 text-gray-600">
                            حصل خطأ أثناء عرض المحتوى. جرّب تحديث الصفحة، ولو استمر سنعالج المسار نفسه.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
                        >
                            إعادة التحميل
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
