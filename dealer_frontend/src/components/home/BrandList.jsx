// Simplified placeholders for brands
const brands = [
    { name: "Land Rover", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Land_Rover_logo_black.svg/1200px-Land_Rover_logo_black.svg.png" },
    { name: "Kia", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Kia_logo.svg/2560px-Kia_logo.svg.png" },
    { name: "Toyota", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/1200px-Toyota_carlogo.svg.png" },
    { name: "Jeep", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Jeep_logo.svg" },
    { name: "Ford", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/2560px-Ford_logo_flat.svg.png" },
];

const BrandList = () => {
    return (
        <section className="py-16">
            <div className="container mx-auto px-6">
                <h3 className="mb-10 text-xl font-medium text-gray-900">Popular Brands</h3>
                <div className="flex flex-wrap items-center justify-between gap-8 opacity-70 grayscale transition-all hover:grayscale-0">
                    {brands.map((brand) => (
                        <div key={brand.name} className="flex flex-col items-center gap-3 group cursor-pointer">
                            <div className="h-16 w-16 md:h-20 md:w-20 object-contain p-2 rounded-full border border-transparent group-hover:border-gray-100 group-hover:shadow-sm flex items-center justify-center">
                                <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">{brand.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
export default BrandList;
