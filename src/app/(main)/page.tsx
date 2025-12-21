import { fetchProjectBalance } from "@/actions/pteron";
import { PointForm } from "@/components/PointForm";
import { Card, CardBody, CardHeader } from "@heroui/card";

export default async function Home() {
	const [projectResult] = await Promise.all([fetchProjectBalance()]);

	if (!projectResult.success || !projectResult.data) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
				<Card className="max-w-md w-full">
					<CardBody className="text-center">
						<p className="text-danger">
							{projectResult.error || "プロジェクト情報の取得に失敗しました"}
						</p>
					</CardBody>
				</Card>
			</div>
		);
	}

	const projectBalance = projectResult.data.balance;
	// const userBalance = userResult.success && userResult.data ? userResult.data.balance : null;

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
			<Card className="max-w-md w-full">
				<CardHeader className="flex flex-col items-center gap-2 pb-0">
					<h1 className="text-2xl font-bold">ポイント管理</h1>
				</CardHeader>
				<CardBody className="flex flex-col items-center gap-6 pt-4">
					<div className="text-center space-y-2">
						<p className="text-lg text-default-600">プロジェクトの残高</p>
						<p className="text-4xl font-bold text-primary">
							{projectBalance.toLocaleString()} copia
						</p>
					</div>
					{/* <div className="text-center space-y-2">
						<p className="text-lg text-default-600">あなたの残高</p>
						<p className="text-4xl font-bold text-success">
							{userBalance !== null ? userBalance.toLocaleString() : "----"} copia
						</p>
						{!userResult.success && <p className="text-sm text-warning">{userResult.error}</p>}
					</div> */}
					<PointForm />
				</CardBody>
			</Card>
		</div>
	);
}
