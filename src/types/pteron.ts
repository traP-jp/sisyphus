// Pteron API 型定義

export interface Project {
	id: string;
	name: string;
	balance: number;
}

export interface Transaction {
	id: string;
	amount: number;
	type: "TRANSFER" | "BILL_PAYMENT" | "SYSTEM";
	userId: string;
	userName?: string;
	projectId: string;
	description?: string;
	createdAt: string;
}

export interface CreateTransactionRequest {
	toUser: string;
	amount: number;
	description?: string;
	requestId?: string;
}

export interface Bill {
	id: string;
	amount: number;
	userId: string;
	userName?: string;
	description?: string;
	status: "PENDING" | "COMPLETED" | "REJECTED" | "FAILED";
	createdAt: string;
}

export interface CreateBillRequest {
	targetUser: string;
	amount: number;
	description?: string;
	successUrl: string;
	cancelUrl: string;
}

export interface CreateBillResponse {
	billId: string;
	paymentUrl: string;
	expiresAt: string;
}

export interface PteronError {
	message: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	next_cursor?: string;
}
