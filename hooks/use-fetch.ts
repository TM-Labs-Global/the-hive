import { getSession } from "next-auth/react";

type QueryParamValue = string | number | boolean;

type RequestProps = {
    url: string;
    method: string;
    body?: Record<string, unknown> | FormData;
    auth?: 'include' | 'omit' | 'required';
    params?: Record<string, QueryParamValue | null | undefined>;
}
type ApiResponse<T = unknown> = {
    data?: T;
    error?: string;
    success: boolean;
    status?: number;
}

export const requestApi = async <T = unknown>({
    url,
    method,
    body,
    auth = 'include',
    params,
}: RequestProps): Promise<ApiResponse<T>> => {
    try {
        const isServer = typeof window === 'undefined';
        const baseUrl = isServer ? process.env.API_BASE_URL : process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!baseUrl) {
            return { success: false, error: "API base URL is not configured." };
        }

        const isFormData = body instanceof FormData;
        const headers: Record<string, string> = {};

        if (body && !isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        if (params) {
            const queryParams = new URLSearchParams();

            for (const key in params) {
                if (params[key] !== undefined && params[key] !== null) {
                    queryParams.append(key, params[key].toString());
                }
            }

            const queryString = queryParams.toString();
            if (queryString) {
                url += url.includes("?") ? `&${queryString}` : `?${queryString}`;
            }
        }

        if (auth !== 'omit') {
            const session = await getSession();

            if (session?.user) {
                headers['Authorization'] = `Bearer ${(session.user as any).token}`;
            } else if (auth === 'required') {
                if (!isServer) {
                    const nextPath = `${window.location.pathname}${window.location.search}`;
                    window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
                    return { success: false, error: "Redirecting to login", status: 401 };
                }

                return { success: false, error: 'Authentication required', status: 401 };
            }
        }

        const response = await fetch(`${baseUrl}${url}`, {
            method,
            headers,
            body: body
                ? (isFormData ? body : JSON.stringify(body))
                : undefined,
        });

        let responseData: unknown = undefined;
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
            responseData = await response.json();
        } else if (response.status !== 204) {
            responseData = await response.text();
        }

        if (!response.ok) {
            let errorMessage = `Request failed with status ${response.status}`;
            if (
                responseData &&
                typeof responseData === "object" &&
                "message" in responseData &&
                typeof (responseData as { message?: unknown }).message === "string"
            ) {
                errorMessage = (responseData as { message: string }).message;
            }

            if (!isServer && response.status === 401) {
                const nextPath = `${window.location.pathname}${window.location.search}`;
                window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
                return {
                    success: false,
                    error: "Redirecting to login",
                    data: responseData as T,
                    status: response.status,
                };
            }

            return {
                success: false,
                data: responseData as T,
                error: errorMessage,
                status: response.status,
            };
        }

        return { data: responseData as T, success: true, status: response.status };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected request error.";
        console.error("Request API Error:", error);
        return { success: false, error: message };
    }
}