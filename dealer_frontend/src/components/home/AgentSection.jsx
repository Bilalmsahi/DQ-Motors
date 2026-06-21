import { Phone, Mail } from 'lucide-react';

const agents = [
    { name: "Ronal Son", role: "Seller Staff", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=300&auto=format&fit=crop" },
    { name: "Lanna Sio", role: "Admin Staff", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop" },
    { name: "Jones Stonie", role: "Manager", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" },
    { name: "James Rome", role: "Manager", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" }
];

const AgentSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-center text-3xl font-semibold text-gray-900">Meet Our Agents</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
                <div key={agent.name} className="flex flex-col items-center text-center group">
                    <div className="mb-4 h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-md">
                        <img src={agent.img} alt={agent.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.role}</p>
                    <div className="mt-3 flex gap-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <button className="rounded-full bg-white p-2 text-gray-500 hover:text-brand-600 shadow-sm"><Phone size={16} /></button>
                        <button className="rounded-full bg-white p-2 text-gray-500 hover:text-brand-600 shadow-sm"><Mail size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default AgentSection;
