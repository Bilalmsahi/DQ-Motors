import { Calendar, Hash, CheckCircle, Tag, MapPin, Truck, Cog, Fuel, Car, Gauge } from 'lucide-react';

const OverviewSidebar = ({ vehicle }) => {
  const details = [
    { label: "Condition", value: vehicle.condition, icon: CheckCircle },
    { label: "Year", value: vehicle.year, icon: Calendar },
    { label: "Mileage", value: `${vehicle.mileage?.toLocaleString()} km`, icon: Truck },
    { label: "Fuel Type", value: vehicle.fuel_type || '---', icon: Fuel },
    { label: "Transmission", value: vehicle.transmission || '---', icon: Cog },
    { label: "Body Style", value: vehicle.body_style || '---', icon: Car },
    { label: "Drivetrain", value: vehicle.drivetrain || '---', icon: Gauge },
    { label: "Engine", value: vehicle.engine || '---', icon: Hash },
    { label: "Doors", value: vehicle.doors || '---', icon: Tag },
    { label: "VIN", value: vehicle.vin || "---", icon: Tag },
    { label: "Status", value: vehicle.status, icon: CheckCircle },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-bold text-gray-900">Car Overview</h3>
      <div className="space-y-4">
        {details.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm">
             <div className="flex items-center gap-3 text-gray-500">
                <item.icon size={16} />
                <span>{item.label}:</span>
             </div>
             <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverviewSidebar;