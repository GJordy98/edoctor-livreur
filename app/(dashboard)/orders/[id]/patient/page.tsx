/**
 * Page Livraison Patient [id] — e-Dr TIM Delivery System
 * Migré depuis patient_delivery.html + delivery_progress_patient.js
 */

export default function PatientDeliveryPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Livraison patient #{params.id}</h1>
      {/* TODO: Infos patient + confirmation livraison */}
      <p className="text-slate-500 text-sm">[Page à migrer depuis patient_delivery.html + delivery_progress_patient.js]</p>
    </div>
  );
}
