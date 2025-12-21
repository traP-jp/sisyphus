// Pteron API クライアント

import {
	Project,
	Transaction,
	CreateTransactionRequest,
	CreateBillRequest,
	CreateBillResponse,
	PteronError,
} from "@/types/pteron";

const PTERON_API_URL = process.env.PTERON_API_URL || "https://pteron.trap.show/api/v1";
const PTERON_ACCESS_TOKEN = process.env.PTERON_ACCESS_TOKEN;

class PteronApiError extends Error {
	constructor(
		public statusCode: number,
		message: string
	) {
		super(message);
		this.name = "PteronApiError";
	}
}

async function pteronFetch<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	if (!PTERON_ACCESS_TOKEN) {
		throw new Error("PTERON_ACCESS_TOKEN is not configured");
	}

	const url = `${PTERON_API_URL}${endpoint}`;
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${PTERON_ACCESS_TOKEN}`,
			...options.headers,
		},
	});

	if (!response.ok) {
		const error: PteronError = await response.json().catch(() => ({
			message: "Unknown error",
		}));
		const errorMessage = `${error.message} (Status: ${response.status}, Endpoint: ${endpoint})`;
		throw new PteronApiError(response.status, errorMessage);
	}

	// 204 No Content の場合は空オブジェクトを返す
	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

/**
 * 自プロジェクトの情報を取得
 */
export async function getProjectInfo(): Promise<Project> {
	return pteronFetch<Project>("/me");
}

/**
 * ユーザーの情報を取得（traQ IDでヘッダーを上書き）
 */
export async function getUserInfo(): Promise<Project> {
	if (!PTERON_ACCESS_TOKEN) {
		throw new Error("PTERON_ACCESS_TOKEN is not configured");
	}

	const url = `${PTERON_API_URL}/me`;
	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${PTERON_ACCESS_TOKEN}`,
		},
	});

	if (!response.ok) {
		const error: PteronError = await response.json().catch(() => ({
			message: "Unknown error",
		}));
		const errorMessage = `${error.message} (Status: ${response.status}, URL: ${url})`;
		throw new PteronApiError(response.status, errorMessage);
	}

	return response.json();
}

/**
 * プロジェクトの情報を取得（プロジェクト IDでヘッダーを上書き）
 */
export async function getProjectInfoById(projectId: string): Promise<Project> {
	if (!PTERON_ACCESS_TOKEN) {
		throw new Error("PTERON_ACCESS_TOKEN is not configured");
	}

	const url = `${PTERON_API_URL}/me`;
	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${PTERON_ACCESS_TOKEN}`,
		},
	});

	if (!response.ok) {
		const error: PteronError = await response.json().catch(() => ({
			message: "Unknown error",
		}));
		const errorMessage = `${error.message} (Status: ${response.status}, URL: ${url})`;
		throw new PteronApiError(response.status, errorMessage);
	}

	return response.json();
}

/**
 * ユーザーへポイントを送金する
 */
export async function sendPoints(
	toUser: string,
	amount: number,
	description?: string,
	requestId?: string
): Promise<Transaction> {
	const body: CreateTransactionRequest = {
		toUser,
		amount,
		description,
		requestId,
	};

	return pteronFetch<Transaction>("/transactions", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/**
 * ユーザーへの請求を作成する（ユーザーがプロジェクトに送金）
 */
export async function createBill(
	targetUser: string,
	amount: number,
	successUrl: string,
	cancelUrl: string,
	description?: string
): Promise<CreateBillResponse> {
	const body: CreateBillRequest = {
		targetUser,
		amount,
		successUrl,
		cancelUrl,
		description,
	};

	console.debug("[Pteron] createBill request body:", JSON.stringify(body, null, 2));

	return pteronFetch<CreateBillResponse>("/bills", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export { PteronApiError };
