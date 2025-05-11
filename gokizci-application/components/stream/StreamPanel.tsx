import { Loading } from "../loading";

export default function StreamPanel() {
    return (
        <div>
            {/* Filter Options */}
            <div className="flex flex-col flex-1 bg-background min-h-screen p-8">
                <div className="flex justify-end mb-4">
                    <div className="flex space-x-2">
                        <div className="flex items-center justify-center bg-primary text-text-light py-1 px-3 rounded-lg h-full">
                            <div className="mr-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M13.3332 4L5.99984 11.3333L2.6665 8"
                                        stroke="#CED4DA"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center justify-center bg-primary text-text-light py-1 px-3 rounded-lg">
                            <div className="mr-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M13.3332 4L5.99984 11.3333L2.6665 8"
                                        stroke="#CED4DA"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            Otomatik Anomali Tespiti
                        </div>
                    </div>
                </div>

                {/* Loading Panel */}
                <div className="flex flex-1 flex-col border border-primary-light justify-between shadow-lg p-4 bg-surface rounded-lg h-full">
                    <div className="flex items-center justify-center flex-1 h-full w-full">
                        <Loading />
                    </div>
                </div>
            </div>
        </div>
    );
}
