function timeout(ms:number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(ms: number): Promise<void> {
	await timeout(ms);
}
