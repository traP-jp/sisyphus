"use server";

import {
	sendPoints,
	createBill,
	PteronApiError,
	getProjectInfo,
	getProjectInfoById,
} from "@/lib/pteron";
import { Project, Transaction, CreateBillResponse } from "@/types/pteron";
import { revalidatePath } from "next/cache";
import getMe from "./getMe";
export interface ActionResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * プロジェクト（自分）の情報を取得
 */
export async function fetchProjectInfo(): Promise<ActionResult<Project>> {
	try {
		const project = await getProjectInfo();

		return { success: true, data: project };
	} catch (error) {
		console.error("fetchProjectInfo error:", error);
		if (error instanceof PteronApiError) {
			return { success: false, error: `API Error (${error.statusCode}): ${error.message}` };
		}
		if (error instanceof Error) {
			return { success: false, error: error.message };
		}
		return { success: false, error: "プロジェクト情報の取得に失敗しました" };
	}
}

/**
 * 環境変数で指定されたユーザーに10ポイントを送金
 */
export async function givePoints(): Promise<ActionResult<Transaction>> {
	try {
		// リクエストユーザーの traP ID を取得（getMe() または環境変数から）
		const toUser = (await getMe()) || process.env.PTERON_USER_ID;

		if (!toUser) {
			return { success: false, error: "ユーザー情報が取得できません" };
		}

		const requestId = crypto.randomUUID();
		const transaction = await sendPoints(toUser, 10, "ポイント獲得ボタンから送金", requestId);

		// ページを再検証して最新のデータを表示
		revalidatePath("/");

		return { success: true, data: transaction };
	} catch (error) {
		if (error instanceof PteronApiError) {
			if (error.statusCode === 400) {
				return { success: false, error: "プロジェクト残高は負になりません" };
			}
			if (error.statusCode === 409) {
				return { success: false, error: "重複したリクエストです" };
			}
			return { success: false, error: error.message };
		}
		return { success: false, error: "ポイント送金に失敗しました" };
	}
}

/**
 * ユーザーに10ポイントの請求を作成（ユーザーがプロジェクトに送金）
 */
export async function requestPoints({
	baseUrl,
}: {
	baseUrl: string;
}): Promise<ActionResult<CreateBillResponse>> {
	// リクエストユーザーの traP ID を取得（getMe() または環境変数から）
	const targetUser = (await getMe()) || process.env.PTERON_USER_ID;

	if (!targetUser) {
		return { success: false, error: "ユーザー情報が取得できません" };
	}

	try {
		const bill = await createBill(
			targetUser,
			10,
			`${baseUrl}/`, // 支払い完了時の戻り先
			`${baseUrl}/`, // キャンセル時の戻り先
			"ポイント送金ボタンから請求"
		);

		// ページを再検証して最新のデータを表示
		revalidatePath("/");

		return { success: true, data: bill };
	} catch (error) {
		if (error instanceof PteronApiError) {
			if (error.statusCode === 400) {
				return { success: false, error: "ユーザーが見つからないか金額が不正です" };
			}
			return { success: false, error: error.message };
		}
		return { success: false, error: "請求の作成に失敗しました" };
	}
}

/**
 * ユーザーの残高を取得（traQ IDを使用）
 */
// export async function fetchUserBalance(): Promise<ActionResult<Project>> {
// 	try {
// 		const headersList = await headers();
// 		const userId = headersList.get("X-Forwarded-User");

// 		if (!userId) {
// 			return { success: false, error: "ユーザーIDが取得できません" };
// 		}

// 		const userInfo = await getUserInfo();
// 		return { success: true, data: userInfo };
// 	} catch (error) {
// 		console.error("fetchUserBalance error:", error);
// 		if (error instanceof PteronApiError) {
// 			return { success: false, error: `API Error (${error.statusCode}): ${error.message}` };
// 		}
// 		if (error instanceof Error) {
// 			return { success: false, error: error.message };
// 		}
// 		return { success: false, error: "ユーザー残高の取得に失敗しました" };
// 	}
// }

/**
 * プロジェクトの残高を取得（プロジェクト IDを使用）
 */
export async function fetchProjectBalance(): Promise<ActionResult<Project>> {
	try {
		const projectId = process.env.PTERON_PROJECT_ID;

		if (!projectId) {
			return { success: false, error: "プロジェクトIDが設定されていません" };
		}

		const projectInfo = await getProjectInfoById(projectId);

		return { success: true, data: projectInfo };
	} catch (error) {
		console.error("fetchProjectBalance error:", error);
		if (error instanceof PteronApiError) {
			return { success: false, error: `API Error (${error.statusCode}): ${error.message}` };
		}
		if (error instanceof Error) {
			return { success: false, error: error.message };
		}
		return { success: false, error: "プロジェクト残高の取得に失敗しました" };
	}
}
