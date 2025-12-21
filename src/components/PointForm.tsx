"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { givePoints, requestPoints } from "@/actions/pteron";

export function PointForm() {
	const router = useRouter();
	const [isReceiving, startReceiving] = useTransition();
	const [isSending, startSending] = useTransition();
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
		null
	);

	// プロジェクトから10ポイントを受け取る
	const handleReceive = () => {
		setMessage(null);
		startReceiving(async () => {
			const result = await givePoints();
			if (result.success) {
				setMessage({ type: "success", text: "10ポイント獲得しました！" });
				// トランザクション内でページを再取得して残高を更新
				router.refresh();
			} else {
				setMessage({ type: "error", text: result.error || "エラーが発生しました" });
			}
		});
	};

	// プロジェクトにポイントを送金する（請求を作成）
	const handleSend = () => {
		setMessage(null);
		startSending(async () => {
			const result = await requestPoints({
				baseUrl: `${location.protocol}//${location.host}`,
			});
			console.log(result);

			if (result.success && result.data) {
				// 決済ページにリダイレクト
				console.debug("[PointForm] Redirecting to:", result.data.paymentUrl);
				window.location.href = result.data.paymentUrl;
			} else {
				setMessage({ type: "error", text: result.error || "エラーが発生しました" });
			}
		});
	};

	return (
		<div className="flex flex-col items-center gap-4 w-full pt-4">
			<div className="flex gap-4">
				<Button
					color="primary"
					size="lg"
					isLoading={isReceiving}
					isDisabled={isSending}
					onPress={handleReceive}
					className="text-lg px-6 py-4"
				>
					{isReceiving ? "処理中..." : "10pt もらう"}
				</Button>
				<Button
					color="secondary"
					size="lg"
					isLoading={isSending}
					isDisabled={isReceiving}
					onPress={handleSend}
					className="text-lg px-6 py-4"
				>
					{isSending ? "処理中..." : "10pt 送る"}
				</Button>
			</div>
			{message && (
				<p
					className={`text-sm ${
						message.type === "success" ? "text-success" : "text-danger"
					}`}
				>
					{message.text}
				</p>
			)}
		</div>
	);
}
