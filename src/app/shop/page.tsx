import { getAuthContext } from "@/lib/auth";
import { ShopCatalog } from "./shop-catalog";

export default async function ShopPage() {
  const auth = await getAuthContext();
  return (
    <ShopCatalog
      currentPlanId={auth.plan.id}
      unlimited={Boolean(auth.plan.unrestricted)}
      currentPlanName={auth.userId ? auth.plan.name : undefined}
    />
  );
}
