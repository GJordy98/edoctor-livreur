/**
 * Page Confirmation Retrait — e-Dr TIM Delivery System
 * Migré depuis pickup_confirmation.html
 */

export default function PickupConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Confirmation retrait #{params.id}</h1>
      {/* TODO: Confirmation ramassage à la pharmacie */}
      <p className="text-slate-500 text-sm">[Page à migrer depuis pickup_confirmation.html]</p>
    </div>
  );
}
