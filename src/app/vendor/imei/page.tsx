import { ImeiChecker } from "@/components/imei/imei-checker";

export default function VendorImeiPage() {
    return (
        <div className="h-full">
            <h1 className="text-2xl font-bold mb-4">Consulta de IMEI</h1>
            <ImeiChecker />
        </div>
    );
}
