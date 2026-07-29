import { getLookupOptions } from "@/lib/lookup";
import { createPurchaseOrder } from "../actions";

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500">{label}</span>
      <select
        name={name}
        required
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function NewPurchaseOrderPage() {
  const [poTypes, poGrades, steelTypes, vendors, shipTos, mills, orderCats] =
    await Promise.all([
      getLookupOptions("PO_TYPE"),
      getLookupOptions("PO_GRADE"),
      getLookupOptions("TYPE_OF_STEEL"),
      getLookupOptions("VENDOR_NAME"),
      getLookupOptions("SHIP_TO"),
      getLookupOptions("MILL"),
      getLookupOptions("ORDER_CATEGORY"),
    ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-neutral-900">Create Purchase Order</h1>
      <p className="mt-1 text-sm text-neutral-500">
        PO No. and date are generated automatically once saved.
      </p>

      <form
        action={createPurchaseOrder}
        className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-6"
      >
        <label className="block">
          <span className="block text-xs font-medium text-neutral-500">
            Order Type
          </span>
          <select
            name="orderType"
            defaultValue="PO"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="PO">PO</option>
          </select>
        </label>
        <Select name="poType" label="PO Type" options={poTypes} />
        <Select name="poGrade" label="PO Grade" options={poGrades} />
        <Select name="typeOfSteel" label="Type of Steel" options={steelTypes} />
        <Select name="vendorName" label="Vendor Name" options={vendors} />
        <Select name="shipTo" label="Ship To" options={shipTos} />
        <Select name="mill" label="Mill" options={mills} />
        <Select name="orderCategory" label="Order Category" options={orderCats} />

        <label className="col-span-2 block">
          <span className="block text-xs font-medium text-neutral-500">Remark</span>
          <textarea
            name="remark"
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
        </label>

        <button
          type="submit"
          className="col-span-2 mt-2 w-fit rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Save PO
        </button>
      </form>
    </div>
  );
}
