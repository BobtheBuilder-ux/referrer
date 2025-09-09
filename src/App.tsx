import React, { useMemo, useState } from "react";
import { supabase, submitDistributorIntake } from "./lib/supabase";
import { sendDistributorEmail } from "./lib/emailService";

// ------- Static Data
const provincesCA = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
];
const statesUS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const productCategories = [
  { key: "afroGrocery", label: "Afro-Caribbean Grocery" },
  { key: "beverages", label: "Beverages (non-alcoholic)" },
  { key: "spicesSauces", label: "Spices, Sauces & Condiments" },
  { key: "snacks", label: "Snacks & Confectionery" },
  { key: "frozen", label: "Frozen & Ready-to-Eat" },
  { key: "freshProduce", label: "Fresh Produce" },
  { key: "beauty", label: "Beauty & Personal Care" },
  { key: "skincare", label: "Skincare & Hydration" },
  { key: "haircare", label: "Hair Care" },
  { key: "home", label: "Home & Cleaning" },
  { key: "textiles", label: "Textiles & Apparel" },
  { key: "pharmacyOTC", label: "Pharmacy (OTC only)" },
  { key: "other", label: "Other (describe below)" },
];

const networkTypes = [
  { key: "independents", label: "Independent Grocery / Ethnic Stores" },
  { key: "chains", label: "Chains & Big Box (e.g., Walmart, Loblaws, Kroger)" },
  { key: "convenience", label: "Convenience & Gas" },
  { key: "beautySupply", label: "Beauty Supply / Cosmetics Retail" },
  { key: "pharmacies", label: "Pharmacies & Drugstores" },
  { key: "foodService", label: "Food Service / HORECA" },
  { key: "wholesalers", label: "Wholesalers & Distributors" },
  { key: "marketplaces", label: "E‑commerce & Marketplaces (Amazon, Walmart.ca)" },
  { key: "specialty", label: "Specialty (Halal, Organic, Fair‑Trade, etc.)" },
];

const serviceBundles = [
  {
    key: "starterBrandKit",
    title: "Starter Brand Kit",
    bullets: ["Logo refresh", "Basic brand guide", "3 product labels", "One‑page website"],
  },
  {
    key: "retailReady",
    title: "Retail‑Ready Packaging & Compliance",
    bullets: ["Nutrition facts (US/CA)", "Bilingual labelling (EN/FR)", "GS1 barcodes", "Shelf tests"],
  },
  {
    key: "ecomLaunch",
    title: "E‑commerce Launch",
    bullets: ["Shopify setup", "Payment & tax config", "Shipping rules", "3 PDP copy blocks"],
  },
  {
    key: "photoVideo",
    title: "Photo & Video Kit",
    bullets: ["Studio photos (10)", "Lifestyle photos (5)", "15‑sec product video", "Editing"],
  },
  {
    key: "socialMedia",
    title: "Social Media Pack",
    bullets: ["Content calendar (30 days)", "10 feed posts", "8 stories", "Hashtag & CTA guide"],
  },
  {
    key: "tradeReadiness",
    title: "Trade Readiness",
    bullets: ["Export coaching", "Certification checklist", "Buyer pitch deck", "Pricing model"],
  },
];

// ------- Types
const initialForm = {
  submissionStatus: "draft", // draft | final
  role: "distributor", // distributor | referral | both
  company: "",
  website: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  // Location
  country: "Canada", // Canada | United States
  city: "",
  provinceState: "",
  postalZip: "",
  coverageDescription: "", // e.g., radius, corridors, key cities
  coverageProvinces: [], // for CA
  coverageStates: [], // for US
  languages: { english: true, french: false, spanish: false, other: "" },
  // Network & Relationships
  networkCounts: {
    independents: 0,
    chains: 0,
    convenience: 0,
    beautySupply: 0,
    pharmacies: 0,
    foodService: 0,
    wholesalers: 0,
    marketplaces: 0,
    specialty: 0,
  },
  monthlyDoorsServiced: 0,
  decisionMakers: 0,
  avgMonthlySellInCAD: 0,
  dealsLast12mo: 0,
  chainAccess: {
    walmart: false,
    costco: false,
    loblaws: false,
    sobeys: false,
    metro: false,
    kroger: false,
    amazon: false,
    other: "",
  },
  // Capabilities & Compliance
  logistics: {
    warehouseSqFt: 0,
    coldChain: false,
    trucksOwned: 0,
    thirdPartyLogistics: true,
  },
  compliance: {
    cfiaImporter: false,
    fdaRegistered: false,
    gs1: false,
    coiInsurance: false,
  },
  // Product Interests
  categories: productCategories.reduce((acc, c) => ({ ...acc, [c.key]: false }), {}),
  categoriesOther: "",
  exclusivityInterest: "no", // no | regional | national
  moqCapacityUnits: 0,
  // Proof & References
  linkedin: "",
  reference1: "",
  reference2: "",
  files: [],
  // Services (quote request)
  requestedServices: serviceBundles.reduce((acc, s) => ({ ...acc, [s.key]: false }), {}),
  serviceNotes: "",
  // Consent
  heardFrom: "",
  agreeContact: false,
  agreePrivacy: false,
};

// ------- Scoring Model
function computeScore(f) {
  let score = 0;

  // Role weight
  if (f.role === "distributor") score += 8;
  if (f.role === "referral") score += 4;
  if (f.role === "both") score += 10;

  // Geography & coverage
  const geoCount =
    (f.country === "Canada" ? f.coverageProvinces.length : f.coverageStates.length) || 0;
  if (geoCount >= 1) score += 4;
  if (geoCount >= 3) score += 8;
  if (geoCount >= 6) score += 12;

  // Languages
  const langs = [f.languages.english, f.languages.french, f.languages.spanish].filter(Boolean)
    .length;
  score += Math.min(langs * 2, 6);

  // Network size by type
  const n = f.networkCounts;
  const totalNetwork = Object.values(n).reduce((a, b) => a + Number(b || 0), 0);
  if (totalNetwork >= 10) score += 6;
  if (totalNetwork >= 50) score += 12;
  if (totalNetwork >= 150) score += 20;

  // Current activity
  const doors = Number(f.monthlyDoorsServiced || 0);
  if (doors >= 10) score += 4;
  if (doors >= 50) score += 10;
  if (doors >= 150) score += 16;

  const dms = Number(f.decisionMakers || 0);
  if (dms >= 5) score += 4;
  if (dms >= 25) score += 8;
  if (dms >= 75) score += 12;

  const sellIn = Number(f.avgMonthlySellInCAD || 0);
  if (sellIn >= 10000) score += 6;
  if (sellIn >= 50000) score += 10;
  if (sellIn >= 200000) score += 14;

  const deals = Number(f.dealsLast12mo || 0);
  if (deals >= 3) score += 4;
  if (deals >= 10) score += 8;
  if (deals >= 25) score += 12;

  // Chain access
  const chainKeys = Object.keys(f.chainAccess).filter((k) => k !== "other");
  const chainCount = chainKeys.filter((k) => f.chainAccess[k]).length;
  score += Math.min(chainCount * 4, 20);

  // Logistics & compliance
  const wh = Number(f.logistics.warehouseSqFt || 0);
  if (wh >= 1000) score += 3;
  if (wh >= 5000) score += 6;
  if (wh >= 20000) score += 10;

  if (f.logistics.coldChain) score += 5;
  if (Number(f.logistics.trucksOwned || 0) >= 2) score += 4;
  if (!f.logistics.thirdPartyLogistics) score += 2; // vertical integration

  if (f.compliance.cfiaImporter) score += 5;
  if (f.compliance.fdaRegistered) score += 5;
  if (f.compliance.gs1) score += 3;
  if (f.compliance.coiInsurance) score += 3;

  // Proof
  if (f.linkedin) score += 2;
  if (f.reference1) score += 2;
  if (f.reference2) score += 2;

  // Product fit bonus (skincare/beauty & afro grocery get small boost for this program)
  const fit = (f.categories.skincare ? 1 : 0) + (f.categories.beauty ? 1 : 0) + (f.categories.afroGrocery ? 1 : 0);
  score += fit * 2;

  return Math.min(score, 100);
}

function scoreTier(score) {
  if (score >= 80) return { label: "Strategic Partner", color: "bg-emerald-500" };
  if (score >= 60) return { label: "Strong", color: "bg-green-500" };
  if (score >= 30) return { label: "Established", color: "bg-yellow-500" };
  return { label: "Emerging", color: "bg-orange-500" };
}

// ------- UI Helpers
const Section = ({ title, children, subtitle }) => (
  <section className="bg-white rounded-2xl shadow p-6 md:p-8 space-y-4">
    <div>
      <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
    <div className="grid gap-4">{children}</div>
  </section>
);

const Card = ({ title, children, footer }) => (
  <div className="border rounded-2xl p-5 h-full flex flex-col">
    <h4 className="font-medium mb-2">{title}</h4>
    <div className="text-sm text-gray-700 flex-1">{children}</div>
    {footer && <div className="pt-3">{footer}</div>}
  </div>
);

export default function IntakeAndServices() {
  const [mode, setMode] = useState("form"); // form | services
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const score = useMemo(() => computeScore(form), [form]);
  const tier = useMemo(() => scoreTier(score), [score]);

  function setField(path, value) {
    setForm((prev) => {
      const copy = { ...prev };
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        obj[p] = { ...obj[p] };
        obj = obj[p];
      }
      obj[parts[parts.length - 1]] = value;
      return copy;
    });
  }

  function toggle(path) {
    setForm((prev) => {
      const copy = { ...prev };
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        obj[p] = { ...obj[p] };
        obj = obj[p];
      }
      obj[parts[parts.length - 1]] = !obj[parts[parts.length - 1]];
      return copy;
    });
  }

  function numberInput(path, min = 0) {
    return (
      <input
        type="number"
        min={min}
        className="w-full border rounded-xl px-3 py-2"
        value={path.split(".").reduce((o, k) => o[k], form)}
        onChange={(e) => setField(path, Number(e.target.value || 0))}
      />
    );
  }

  function textInput(path, placeholder = "") {
    return (
      <input
        type="text"
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2"
        value={path.split(".").reduce((o, k) => o[k], form)}
        onChange={(e) => setField(path, e.target.value)}
      />
    );
  }

  function textarea(path, placeholder = "") {
    return (
      <textarea
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2 min-h-[90px]"
        value={path.split(".").reduce((o, k) => o[k], form)}
        onChange={(e) => setField(path, e.target.value)}
      />
    );
  }

  function select(path, options) {
    return (
      <select
        className="w-full border rounded-xl px-3 py-2 bg-white"
        value={path.split(".").reduce((o, k) => o[k], form)}
        onChange={(e) => setField(path, e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  function fileInput() {
    return (
      <input
        type="file"
        multiple
        className="w-full border rounded-xl px-3 py-2"
        onChange={(e) => setField("files", Array.from(e.target.files || []))}
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare the submission data
      const submissionData = {
        ...form,
        computedScore: score,
        computedTier: tier.label,
        submittedAt: new Date().toISOString(),
        submissionStatus: 'final'
      };

      // Transform form data to match database schema
      const dbData = {
        submission_status: 'final',
        role: submissionData.role,
        company: submissionData.company,
        website: submissionData.website,
        first_name: submissionData.firstName,
        last_name: submissionData.lastName,
        email: submissionData.email,
        phone: submissionData.phone,
        country: submissionData.country,
        city: submissionData.city,
        province_state: submissionData.provinceState,
        postal_zip: submissionData.postalZip,
        coverage_description: submissionData.coverageDescription,
        coverage_provinces: submissionData.coverageProvinces,
        coverage_states: submissionData.coverageStates,
        languages_english: submissionData.languages.english,
        languages_french: submissionData.languages.french,
        languages_spanish: submissionData.languages.spanish,
        languages_other: submissionData.languages.other,
        network_independents: submissionData.networkCounts.independents,
        network_chains: submissionData.networkCounts.chains,
        network_convenience: submissionData.networkCounts.convenience,
        network_beauty_supply: submissionData.networkCounts.beautySupply,
        network_pharmacies: submissionData.networkCounts.pharmacies,
        network_food_service: submissionData.networkCounts.foodService,
        network_wholesalers: submissionData.networkCounts.wholesalers,
        network_marketplaces: submissionData.networkCounts.marketplaces,
        network_specialty: submissionData.networkCounts.specialty,
        monthly_doors_serviced: submissionData.monthlyDoorsServiced,
        decision_makers: submissionData.decisionMakers,
        avg_monthly_sell_in_cad: submissionData.avgMonthlySellInCAD,
        deals_last_12mo: submissionData.dealsLast12mo,
        chain_walmart: submissionData.chainAccess.walmart,
        chain_costco: submissionData.chainAccess.costco,
        chain_loblaws: submissionData.chainAccess.loblaws,
        chain_sobeys: submissionData.chainAccess.sobeys,
        chain_metro: submissionData.chainAccess.metro,
        chain_kroger: submissionData.chainAccess.kroger,
        chain_amazon: submissionData.chainAccess.amazon,
        chain_other: submissionData.chainAccess.other,
        warehouse_sq_ft: submissionData.logistics.warehouseSqFt,
        cold_chain: submissionData.logistics.coldChain,
        trucks_owned: submissionData.logistics.trucksOwned,
        third_party_logistics: submissionData.logistics.thirdPartyLogistics,
        cfia_importer: submissionData.compliance.cfiaImporter,
        fda_registered: submissionData.compliance.fdaRegistered,
        gs1: submissionData.compliance.gs1,
        coi_insurance: submissionData.compliance.coiInsurance,
        category_afro_grocery: submissionData.categories.afroGrocery,
        category_beverages: submissionData.categories.beverages,
        category_spices_sauces: submissionData.categories.spicesSauces,
        category_snacks: submissionData.categories.snacks,
        category_frozen: submissionData.categories.frozen,
        category_fresh_produce: submissionData.categories.freshProduce,
        category_beauty: submissionData.categories.beauty,
        category_skincare: submissionData.categories.skincare,
        category_haircare: submissionData.categories.haircare,
        category_home: submissionData.categories.home,
        category_textiles: submissionData.categories.textiles,
        category_pharmacy_otc: submissionData.categories.pharmacyOTC,
        category_other: submissionData.categories.other,
        categories_other_description: submissionData.categoriesOther,
        exclusivity_interest: submissionData.exclusivityInterest,
        moq_capacity_units: submissionData.moqCapacityUnits,
        linkedin: submissionData.linkedin,
        reference1: submissionData.reference1,
        reference2: submissionData.reference2,
        service_starter_brand_kit: submissionData.requestedServices.starterBrandKit,
        service_retail_ready: submissionData.requestedServices.retailReady,
        service_ecom_launch: submissionData.requestedServices.ecomLaunch,
        service_photo_video: submissionData.requestedServices.photoVideo,
        service_social_media: submissionData.requestedServices.socialMedia,
        service_trade_readiness: submissionData.requestedServices.tradeReadiness,
        service_notes: submissionData.serviceNotes,
        heard_from: submissionData.heardFrom,
        agree_contact: submissionData.agreeContact,
        agree_privacy: submissionData.agreePrivacy,
        computed_score: submissionData.computedScore,
        computed_tier: submissionData.computedTier,
        submitted_at: submissionData.submittedAt
      };

      // Submit to Supabase
      const result = await submitDistributorIntake(dbData);
      
      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }

      // Send email notification
      const emailResult = await sendDistributorEmail({
        company: submissionData.company,
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        email: submissionData.email,
        phone: submissionData.phone,
        website: submissionData.website,
        role: submissionData.role,
        country: submissionData.country,
        city: submissionData.city,
        provinceState: submissionData.provinceState,
        postalZip: submissionData.postalZip,
        coverageDescription: submissionData.coverageDescription,
        coverageProvinces: submissionData.coverageProvinces,
        coverageStates: submissionData.coverageStates,
        languages: submissionData.languages,
        networkCounts: submissionData.networkCounts,
        monthlyDoorsServiced: submissionData.monthlyDoorsServiced,
        decisionMakers: submissionData.decisionMakers,
        avgMonthlySellInCAD: submissionData.avgMonthlySellInCAD,
        dealsLast12mo: submissionData.dealsLast12mo,
        chainAccess: submissionData.chainAccess,
        logistics: submissionData.logistics,
        compliance: submissionData.compliance,
        categories: submissionData.categories,
        categoriesOther: submissionData.categoriesOther,
        exclusivityInterest: submissionData.exclusivityInterest,
        moqCapacityUnits: submissionData.moqCapacityUnits,
        linkedin: submissionData.linkedin,
        reference1: submissionData.reference1,
        reference2: submissionData.reference2,
        heardFrom: submissionData.heardFrom,
        serviceNotes: submissionData.serviceNotes,
        computedScore: submissionData.computedScore,
        computedTier: submissionData.computedTier,
        requestedServices: Object.keys(submissionData.requestedServices)
          .filter(key => submissionData.requestedServices[key])
          .map(key => serviceBundles.find(s => s.key === key)?.title || key),
        submittedAt: submissionData.submittedAt
      });

      if (!emailResult.success) {
        console.warn('Email sending failed:', emailResult.error);
        // Don't throw error for email failure - submission was successful
      }

      // Set the submitted state with the result data
      setSubmitted({ ...submissionData, id: result.data?.id });
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(error.message || 'An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(submitted || { ...form, computedScore: score, computedTier: tier.label }, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `9QC-intake-${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">9QC</div>
            <div>
              <h1 className="text-lg font-semibold">Distributor & Referral Intake</h1>
              <p className="text-xs text-gray-500 -mt-0.5">North America • Qualification + Service Quote</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("services")}
              className={`px-3 py-2 rounded-xl text-sm border ${mode === "services" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              Service Bundles
            </button>
            <button
              onClick={() => setMode("form")}
              className={`px-3 py-2 rounded-xl text-sm border ${mode === "form" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              Distributor / Referral Form
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Score Banner */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Live Network Strength</h2>
            <p className="text-sm text-gray-600">Score updates as you fill the form. Use this to self‑assess readiness.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none w-full">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${tier.color}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold leading-none">{score}</div>
              <div className="text-sm text-gray-600">{tier.label}</div>
            </div>
          </div>
        </div>

        {mode === "services" ? (
          <>
            <Section
              title="Service Bundles (Bouquet)"
              subtitle="Pick the bouquets you want a quote for. We'll get back to you with scope, timeline, and pricing."
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceBundles.map((s) => (
                  <Card
                    key={s.key}
                    title={s.title}
                    footer={
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={form.requestedServices[s.key]}
                          onChange={() =>
                            setForm((p) => ({
                              ...p,
                              requestedServices: {
                                ...p.requestedServices,
                                [s.key]: !p.requestedServices[s.key],
                              },
                            }))
                          }
                        />
                        <span>Add to quote</span>
                      </label>
                    }
                  >
                    <ul className="list-disc list-inside space-y-1">
                      {s.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Notes / Specific asks</label>
                {textarea("serviceNotes", "Tell us about your brand, timeline, budget range, or specific deliverables...")}
              </div>
            </Section>

            <Section title="Contact Information for Quote">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company</label>
                  {textInput("company", "Your company name")}
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  {textInput("website", "https://...")}
                </div>
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  {textInput("firstName")}
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  {textInput("lastName")}
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  {textInput("email")}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  {textInput("phone")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.agreeContact}
                    onChange={() => toggle("agreeContact")}
                  />
                  <span>I agree to be contacted about my quote request.</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.agreePrivacy}
                    onChange={() => toggle("agreePrivacy")}
                  />
                  <span>I accept the privacy policy.</span>
                </label>
              </div>
            </Section>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <Section title="Profile & Role">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Submission Status</label>
                  {select("submissionStatus", [
                    { value: "draft", label: "Draft (unfinished)" },
                    { value: "final", label: "Final (ready for review)" },
                  ])}
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  {select("role", [
                    { value: "distributor", label: "Distributor" },
                    { value: "referral", label: "Referral Agent" },
                    { value: "both", label: "Both" },
                  ])}
                </div>
                <div>
                  <label className="text-sm font-medium">Company</label>
                  {textInput("company")}
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  {textInput("website", "https://...")}
                </div>
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  {textInput("firstName")}
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  {textInput("lastName")}
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  {textInput("email")}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  {textInput("phone")}
                </div>
              </div>
            </Section>

            <Section title="Geography & Coverage" subtitle="Tell us where you are and the area you actively cover.">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  {select("country", [
                    { value: "Canada", label: "Canada" },
                    { value: "United States", label: "United States" },
                  ])}
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  {textInput("city")}
                </div>
                <div>
                  <label className="text-sm font-medium">Province/State</label>
                  {textInput("provinceState")}
                </div>
                <div>
                  <label className="text-sm font-medium">Postal/Zip</label>
                  {textInput("postalZip")}
                </div>
              </div>

              {form.country === "Canada" ? (
                <div>
                  <label className="text-sm font-medium">Provinces Covered</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {provincesCA.map((p) => (
                      <label key={p} className="inline-flex items-center gap-2 text-sm border rounded-xl px-3 py-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={form.coverageProvinces.includes(p)}
                          onChange={() => {
                            setForm((prev) => ({
                              ...prev,
                              coverageProvinces: prev.coverageProvinces.includes(p)
                                ? prev.coverageProvinces.filter((x) => x !== p)
                                : [...prev.coverageProvinces, p],
                            }));
                          }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">States Covered</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-64 overflow-auto p-2 border rounded-xl bg-gray-50">
                    {statesUS.map((s) => (
                      <label key={s} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={form.coverageStates.includes(s)}
                          onChange={() => {
                            setForm((prev) => ({
                              ...prev,
                              coverageStates: prev.coverageStates.includes(s)
                                ? prev.coverageStates.filter((x) => x !== s)
                                : [...prev.coverageStates, s],
                            }));
                          }}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Coverage Description</label>
                {textarea(
                  "coverageDescription",
                  "e.g., 150km radius of Montreal; GTA core + Ottawa; Pacific Northwest corridor; Key cities served..."
                )}
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Languages</label>
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={form.languages.english}
                        onChange={() => toggle("languages.english")}
                      />
                      English
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={form.languages.french}
                        onChange={() => toggle("languages.french")}
                      />
                      French
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={form.languages.spanish}
                        onChange={() => toggle("languages.spanish")}
                      />
                      Spanish
                    </label>
                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Other (optional)"
                      value={form.languages.other}
                      onChange={(e) => setField("languages.other", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Network & Relationships" subtitle="Quantify your network and current selling activity.">
              <div className="grid md:grid-cols-2 gap-4">
                {networkTypes.map((t) => (
                  <div key={t.key} className="grid grid-cols-5 items-center gap-3">
                    <label className="col-span-3 text-sm">{t.label}</label>
                    <div className="col-span-2">{numberInput(`networkCounts.${t.key}`)}</div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Doors serviced monthly (#)</label>
                  {numberInput("monthlyDoorsServiced")}
                </div>
                <div>
                  <label className="text-sm font-medium">Decision‑maker contacts (#)</label>
                  {numberInput("decisionMakers")}
                </div>
                <div>
                  <label className="text-sm font-medium">Avg monthly sell‑in (CAD)</label>
                  {numberInput("avgMonthlySellInCAD")}
                </div>
                <div>
                  <label className="text-sm font-medium">Deals closed (last 12 mo)</label>
                  {numberInput("dealsLast12mo")}
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chain access (tick all that apply)</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ["walmart", "Walmart"],
                      ["costco", "Costco"],
                      ["loblaws", "Loblaws"],
                      ["sobeys", "Sobeys"],
                      ["metro", "Metro"],
                      ["kroger", "Kroger"],
                      ["amazon", "Amazon"],
                    ].map(([k, label]) => (
                      <label key={k} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={form.chainAccess[k]}
                          onChange={() => toggle(`chainAccess.${k}`)}
                        />
                        {label}
                      </label>
                    ))}
                    <input
                      className="border rounded-xl px-3 py-2 col-span-2"
                      placeholder="Other chain(s)"
                      value={form.chainAccess.other}
                      onChange={(e) => setField("chainAccess.other", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Capabilities & Compliance" subtitle="Tell us what operational capacity you have.">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Warehouse size (sq ft)</label>
                  {numberInput("logistics.warehouseSqFt")}
                </div>
                <div>
                  <label className="text-sm font-medium">Cold chain available</label>
                  <div>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-xl mr-2 ${form.logistics.coldChain ? "bg-gray-900 text-white" : "bg-white"}`}
                      onClick={() => toggle("logistics.coldChain")}
                    >
                      {form.logistics.coldChain ? "Yes" : "No"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Trucks owned (#)</label>
                  {numberInput("logistics.trucksOwned")}
                </div>
                <div>
                  <label className="text-sm font-medium">Use 3PL</label>
                  <div>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-xl mr-2 ${form.logistics.thirdPartyLogistics ? "bg-gray-900 text-white" : "bg-white"}`}
                      onClick={() => toggle("logistics.thirdPartyLogistics")}
                    >
                      {form.logistics.thirdPartyLogistics ? "Yes" : "No"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Compliance & Certifications</label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={form.compliance.cfiaImporter} onChange={() => toggle("compliance.cfiaImporter")} />
                    CFIA Importer (Canada)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={form.compliance.fdaRegistered} onChange={() => toggle("compliance.fdaRegistered")} />
                    FDA Registered (USA)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={form.compliance.gs1} onChange={() => toggle("compliance.gs1")} />
                    GS1 Barcodes
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={form.compliance.coiInsurance} onChange={() => toggle("compliance.coiInsurance")} />
                    Certificate of Insurance
                  </label>
                </div>
              </div>
            </Section>

            <Section title="Product Interests" subtitle="What would you like to represent?">
              <div className="grid md:grid-cols-3 gap-3">
                {productCategories.map((c) => (
                  <label key={c.key} className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-sm bg-white">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.categories[c.key]}
                      onChange={() =>
                        setForm((p) => ({
                          ...p,
                          categories: { ...p.categories, [c.key]: !p.categories[c.key] },
                        }))
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Other categories (describe)</label>
                  {textInput("categoriesOther")}
                </div>
                <div>
                  <label className="text-sm font-medium">Exclusivity interest</label>
                  {select("exclusivityInterest", [
                    { value: "no", label: "No" },
                    { value: "regional", label: "Regional" },
                    { value: "national", label: "National" },
                  ])}
                </div>
                <div>
                  <label className="text-sm font-medium">MOQ capacity (units per PO)</label>
                  {numberInput("moqCapacityUnits")}
                </div>
              </div>
            </Section>

            <Section title="Proof & References" subtitle="Optional but strongly recommended for a higher score.">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  {textInput("linkedin", "https://www.linkedin.com/in/...")}
                </div>
                <div>
                  <label className="text-sm font-medium">Reference 1 (name, company, email)</label>
                  {textInput("reference1")}
                </div>
                <div>
                  <label className="text-sm font-medium">Reference 2 (name, company, email)</label>
                  {textInput("reference2")}
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm font-medium">Upload proof (line sheets, case studies, photos)</label>
                  {fileInput()}
                </div>
              </div>
            </Section>

            <Section title="Consent & Submit">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">How did you hear about us?</label>
                  {textInput("heardFrom", "Instagram ad, referral, event, etc.")}
                </div>
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm mt-6">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.agreeContact}
                      onChange={() => toggle("agreeContact")}
                    />
                    I agree to be contacted about this submission.
                  </label>
                </div>
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm mt-6">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.agreePrivacy}
                      onChange={() => toggle("agreePrivacy")}
                    />
                    I accept the privacy policy.
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                  <p className="font-medium">Submission Error</p>
                  <p className="text-sm">{submitError}</p>
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!form.agreePrivacy || !form.agreeContact || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Qualification'}
                </button>
                <button
                  type="button"
                  onClick={downloadJSON}
                  className="px-4 py-2 rounded-xl border"
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border"
                >
                  Print
                </button>
              </div>
            </Section>
          </form>
        )}

        {submitted && (
          <Section title="Submission Received">
            <p className="text-sm text-gray-700">
              Thank you! Your qualification snapshot is below. A 9QC team member will review your submission.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Card title="Headline Score">
                <div className="text-4xl font-bold">{score}</div>
                <div className="text-gray-600">{tier.label}</div>
              </Card>
              <Card title="Recommended Next Step">
                <ul className="list-disc list-inside text-sm space-y-1">
                  {score >= 80 && <li>Invite to strategic partner call within 48h.</li>}
                  {score >= 60 && score < 80 && <li>Schedule capabilities deep‑dive and brand alignment.</li>}
                  {score >= 30 && score < 60 && <li>Request additional proof (references, case studies) and pilot region.</li>}
                  {score < 30 && <li>Add more details; consider a referral‑only pilot to build traction.</li>}
                </ul>
              </Card>
              <Card title="Submission Status">
                <div className="text-sm">{submitted.submissionStatus === "final" ? "Final – ready for review" : "Draft – incomplete"}</div>
              </Card>
            </div>
            <details className="bg-gray-50 rounded-xl p-4">
              <summary className="cursor-pointer font-medium">View JSON</summary>
              <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(submitted, null, 2)}</pre>
            </details>
            <div className="pt-2">
              <button onClick={downloadJSON} className="px-4 py-2 rounded-xl border">Download JSON</button>
            </div>
          </Section>
        )}

        <footer className="text-xs text-gray-500 text-center py-6">
          © {new Date().getFullYear()} 9QC Inc. • Intake & Qualification • This is a demo UI – connect to your backend (Airtable, HubSpot, or custom API) to store submissions.
        </footer>
      </main>
    </div>
  );
}