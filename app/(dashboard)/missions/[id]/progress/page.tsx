/**
 * Page Progression Livraison [id] — e-Dr TIM Delivery System
 * Migré depuis delivery_progress.html + delivery_progress.js
 */

export default function DeliveryProgressPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Progression livraison #{params.id}</h1>
      {/* TODO: Étapes de livraison, carte, statut, actions */}
      <p className="text-slate-500 text-sm">[Page à migrer depuis delivery_progress.html + delivery_progress.js]</p>
    </div>
  );
}
