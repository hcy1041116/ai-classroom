import axios from "axios";

const api = axios.create({
    baseURL: "",
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (v?: unknown) => void;
    reject: (r?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
    failedQueue = [];
};

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const req = error.config;
        if (
            error.response?.status === 401 &&
            !req._retry &&
            !req.url?.includes("/auth/refresh") &&
            !req.url?.includes("/auth/login") &&
            !req.url?.includes("/auth/me")
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(req));
            }
            req._retry = true;
            isRefreshing = true;
            try {
                await api.post("/auth/refresh");
                processQueue(null);
                return api(req);
            } catch (e) {
                processQueue(e as Error);
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;