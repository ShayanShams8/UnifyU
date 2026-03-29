import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, borderRadius, shadows } from "../theme/colors";
import {
  convertCurrency,
  calcFundingGap,
  searchScholarships,
  checkScam,
  generateAppeal,
  getEmergencyResources,
  proofOfFundsPlan,
} from "../api/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToolKey =
  | "currency"
  | "fundingGap"
  | "scholarships"
  | "scamCheck"
  | "appeal"
  | "emergency"
  | "proofOfFunds";

const TOOLS: { key: ToolKey; icon: string; title: string; sub: string; color: string }[] = [
  { key: "currency", icon: "swap-horizontal", title: "Currency Converter", sub: "Real-time exchange rates", color: "#2563eb" },
  { key: "fundingGap", icon: "analytics-outline", title: "Funding Gap", sub: "Calculate & close your gap", color: "#7c3aed" },
  { key: "scholarships", icon: "ribbon-outline", title: "Scholarship Finder", sub: "AI-powered scholarship search", color: "#0891b2" },
  { key: "scamCheck", icon: "shield-checkmark-outline", title: "Scam Shield", sub: "Verify scholarship legitimacy", color: "#16a34a" },
  { key: "appeal", icon: "document-text-outline", title: "Appeal Copilot", sub: "Draft your aid appeal letter", color: "#ea580c" },
  { key: "emergency", icon: "flash-outline", title: "Emergency Aid", sub: "Immediate funding resources", color: "#dc2626" },
  { key: "proofOfFunds", icon: "card-outline", title: "Proof of Funds", sub: "F-1/J-1 visa fund planning", color: "#0d9488" },
];

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function FinancialWorkspaceScreen() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Funding OS</Text>
        <Text style={styles.headerSub}>Your financial workspace</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {TOOLS.map((tool) => (
          <ToolCard key={tool.key} tool={tool} onPress={() => setActiveTool(tool.key)} />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Tool Modals */}
      {activeTool === "currency" && (
        <CurrencyModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "fundingGap" && (
        <FundingGapModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "scholarships" && (
        <ScholarshipModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "scamCheck" && (
        <ScamCheckModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "appeal" && (
        <AppealModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "emergency" && (
        <EmergencyModal onClose={() => setActiveTool(null)} />
      )}
      {activeTool === "proofOfFunds" && (
        <ProofOfFundsModal onClose={() => setActiveTool(null)} />
      )}
    </SafeAreaView>
  );
}

// ── Tool Card ──────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  onPress,
}: {
  tool: (typeof TOOLS)[number];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardIcon, { backgroundColor: tool.color + "18" }]}>
        <Ionicons name={tool.icon as any} size={26} color={tool.color} />
      </View>
      <Text style={styles.cardTitle}>{tool.title}</Text>
      <Text style={styles.cardSub}>{tool.sub}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.outlineVariant} style={{ marginTop: 8 }} />
    </TouchableOpacity>
  );
}

// ── Shared Modal Shell ─────────────────────────────────────────────────────────

function ModalShell({
  title,
  icon,
  color,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalShell.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={modalShell.header}>
            <TouchableOpacity onPress={onClose} style={modalShell.closeBtn}>
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </TouchableOpacity>
            <View style={[modalShell.iconWrap, { backgroundColor: color + "18" }]}>
              <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={modalShell.title}>{title}</Text>
          </View>
          <ScrollView
            contentContainerStyle={modalShell.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Result Box ─────────────────────────────────────────────────────────────────

function ResultBox({ text }: { text: string }) {
  return (
    <View style={resultBox.container}>
      <Text style={resultBox.text}>{text}</Text>
    </View>
  );
}

// ── Primary Action Button ──────────────────────────────────────────────────────

function ActionButton({
  title,
  onPress,
  loading,
  color,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  color?: string;
}) {
  const bg = color || colors.primary;
  const dim = color ? color + "cc" : colors.primaryDim;
  return (
    <TouchableOpacity
      style={[actionBtn.btn, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[bg, dim]}
        style={actionBtn.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={actionBtn.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}</Text>
      <TextInput
        style={[field.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

// ── 1. Currency Converter ──────────────────────────────────────────────────────

function CurrencyModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const CURRENCIES = [
    "USD","EUR","GBP","CAD","AUD","JPY","CNY","INR",
    "IRR","AED","SAR","KRW","BRL","MXN","CHF","SGD","TRY",
  ];

  const convert = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await convertCurrency({ amount: amt, from_currency: from, to_currency: to });
      const d = res.data;
      setResult(
        `${amt} ${d.from_currency} = ${d.converted} ${d.to_currency}\n\nExchange rate: 1 ${d.from_currency} = ${d.rate} ${d.to_currency}\n\n⚠️ Rates are indicative. Verify with your bank before transactions.`
      );
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not fetch rate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Currency Converter" icon="swap-horizontal" color="#2563eb" onClose={onClose}>
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 1000" />

      <Text style={field.label}>From Currency</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 8, marginBottom: 14 }}
      >
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[chip.btn, from === c && chip.active]}
            onPress={() => setFrom(c)}
          >
            <Text style={[chip.text, from === c && chip.activeText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[field.label, { marginTop: 4 }]}>To Currency</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 8, marginBottom: 14 }}
      >
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[chip.btn, to === c && chip.active]}
            onPress={() => setTo(c)}
          >
            <Text style={[chip.text, to === c && chip.activeText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ActionButton title="Convert" onPress={convert} loading={loading} color="#2563eb" />
      {result && <ResultBox text={result} />}
    </ModalShell>
  );
}

// ── 2. Funding Gap Calculator ──────────────────────────────────────────────────

function FundingGapModal({ onClose }: { onClose: () => void }) {
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [coa, setCoa] = useState("");
  const [guaranteedAid, setGuaranteedAid] = useState("0");
  const [likelyAid, setLikelyAid] = useState("0");
  const [userResources, setUserResources] = useState("0");
  const [result, setResult] = useState<{ gap: number; analysis: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    if (!coa || isNaN(parseFloat(coa))) {
      Alert.alert("Error", "Please enter a valid cost of attendance");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await calcFundingGap({
        coa: parseFloat(coa),
        guaranteed_aid: parseFloat(guaranteedAid) || 0,
        likely_aid: parseFloat(likelyAid) || 0,
        user_resources: parseFloat(userResources) || 0,
        school_name: school,
        program,
      });
      setResult({ gap: res.data.gap, analysis: res.data.analysis });
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not calculate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Funding Gap Calculator" icon="analytics-outline" color="#7c3aed" onClose={onClose}>
      <Field label="School Name (optional)" value={school} onChangeText={setSchool} placeholder="e.g. MIT, Stanford" />
      <Field label="Program (optional)" value={program} onChangeText={setProgram} placeholder="e.g. Computer Science MS" />
      <Field label="Annual Cost of Attendance ($)" value={coa} onChangeText={setCoa} keyboardType="decimal-pad" placeholder="e.g. 60000" />
      <Field label="Guaranteed Aid (scholarships, grants) ($)" value={guaranteedAid} onChangeText={setGuaranteedAid} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Likely Aid (fellowships, TA/RA) ($)" value={likelyAid} onChangeText={setLikelyAid} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Your Own Resources ($)" value={userResources} onChangeText={setUserResources} keyboardType="decimal-pad" placeholder="0" />

      {result && (
        <View style={gapCard.container}>
          <Text style={gapCard.label}>Your Funding Gap</Text>
          <Text style={[gapCard.amount, { color: result.gap === 0 ? "#16a34a" : "#dc2626" }]}>
            ${result.gap.toLocaleString()}/year
          </Text>
        </View>
      )}

      <ActionButton title="Calculate & Get Plan" onPress={calculate} loading={loading} color="#7c3aed" />
      {result && <ResultBox text={result.analysis} />}
    </ModalShell>
  );
}

// ── 3. Scholarship Finder ──────────────────────────────────────────────────────

function ScholarshipModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [degree, setDegree] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const DEGREES = ["Undergraduate", "Master's", "PhD", "Any"];

  const search = async () => {
    if (!query.trim()) {
      Alert.alert("Error", "Please enter a search query");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await searchScholarships({
        query: query.trim(),
        country_of_origin: country,
        field_of_study: fieldOfStudy,
        degree_level: degree,
      });
      setResult(res.data.results);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Scholarship Finder" icon="ribbon-outline" color="#0891b2" onClose={onClose}>
      <Field label="What are you looking for?" value={query} onChangeText={setQuery} placeholder="e.g. Scholarships for Iranian students in engineering" />
      <Field label="Your Country of Origin (optional)" value={country} onChangeText={setCountry} placeholder="e.g. Iran, India, Nigeria" />
      <Field label="Field of Study (optional)" value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="e.g. Computer Science, Medicine" />

      <Text style={field.label}>Degree Level</Text>
      <View style={chip.row}>
        {DEGREES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[chip.btn, degree === d && chip.active]}
            onPress={() => setDegree(d === degree ? "" : d)}
          >
            <Text style={[chip.text, degree === d && chip.activeText]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ActionButton title="Find Scholarships" onPress={search} loading={loading} color="#0891b2" />
      {result && <ResultBox text={result} />}
    </ModalShell>
  );
}

// ── 4. Scam Shield ────────────────────────────────────────────────────────────

function ScamCheckModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ trust_score: number; analysis: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in the scholarship name and description");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await checkScam({
        scholarship_name: name.trim(),
        description: description.trim(),
        source_url: url.trim(),
      });
      setResult({ trust_score: res.data.trust_score, analysis: res.data.analysis });
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Check failed");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor =
    result === null ? colors.primary
      : result.trust_score >= 7 ? "#16a34a"
      : result.trust_score >= 4 ? "#ea580c"
      : "#dc2626";

  return (
    <ModalShell title="Scam Shield" icon="shield-checkmark-outline" color="#16a34a" onClose={onClose}>
      <Field label="Scholarship / Offer Name" value={name} onChangeText={setName} placeholder="e.g. Global Excellence Award 2024" />
      <Field label="Description / What they told you" value={description} onChangeText={setDescription} placeholder="Paste the email or offer text here..." multiline />
      <Field label="Website URL (optional)" value={url} onChangeText={setUrl} placeholder="e.g. https://..." />

      {result && (
        <View style={[gapCard.container, { borderLeftColor: scoreColor }]}>
          <Text style={gapCard.label}>Trust Score</Text>
          <Text style={[gapCard.amount, { color: scoreColor }]}>{result.trust_score}/10</Text>
          <Text style={[gapCard.label, { marginTop: 4 }]}>
            {result.trust_score >= 7 ? "Likely Legitimate" : result.trust_score >= 4 ? "Proceed with Caution" : "High Scam Risk"}
          </Text>
        </View>
      )}

      <ActionButton title="Check for Scams" onPress={check} loading={loading} color="#16a34a" />
      {result && <ResultBox text={result.analysis} />}
    </ModalShell>
  );
}

// ── 5. Appeal Copilot ────────────────────────────────────────────────────────

function AppealModal({ onClose }: { onClose: () => void }) {
  const [school, setSchool] = useState("");
  const [aid, setAid] = useState("");
  const [circumstances, setCircumstances] = useState("");
  const [aidType, setAidType] = useState("merit");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const AID_TYPES = ["merit", "need", "special_circumstances"];

  const generate = async () => {
    if (!school.trim() || !circumstances.trim()) {
      Alert.alert("Error", "Please fill in school name and circumstances");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await generateAppeal({
        school_name: school.trim(),
        current_aid: parseFloat(aid) || 0,
        circumstances: circumstances.trim(),
        aid_type: aidType,
      });
      setResult(res.data.draft);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not generate appeal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Appeal Copilot" icon="document-text-outline" color="#ea580c" onClose={onClose}>
      <Field label="School Name" value={school} onChangeText={setSchool} placeholder="e.g. University of Michigan" />
      <Field label="Current Aid Package ($/year)" value={aid} onChangeText={setAid} keyboardType="decimal-pad" placeholder="e.g. 15000" />

      <Text style={field.label}>Appeal Type</Text>
      <View style={chip.row}>
        {AID_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[chip.btn, aidType === t && chip.active]}
            onPress={() => setAidType(t)}
          >
            <Text style={[chip.text, aidType === t && chip.activeText]}>
              {t === "merit" ? "Merit" : t === "need" ? "Need-Based" : "Special Circumstances"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field
        label="Explain your circumstances"
        value={circumstances}
        onChangeText={setCircumstances}
        placeholder="Describe why you need more aid — change in family finances, competing offers, medical expenses, etc."
        multiline
      />

      <ActionButton title="Draft My Appeal" onPress={generate} loading={loading} color="#ea580c" />
      {result && <ResultBox text={result} />}
    </ModalShell>
  );
}

// ── 6. Emergency Aid Router ───────────────────────────────────────────────────

function EmergencyModal({ onClose }: { onClose: () => void }) {
  const [emergencyType, setEmergencyType] = useState("");
  const [school, setSchool] = useState("");
  const [context, setContext] = useState("");
  const [urgency, setUrgency] = useState("high");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const EMERGENCY_TYPES = ["Food insecurity", "Housing crisis", "Medical emergency", "Tuition gap", "Utility crisis", "Other"];
  const URGENCY = ["high", "medium", "low"];

  const find = async () => {
    if (!emergencyType) {
      Alert.alert("Error", "Please select or enter an emergency type");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await getEmergencyResources({
        emergency_type: emergencyType,
        urgency,
        school_name: school,
        context,
      });
      setResult(res.data.resources);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not fetch resources");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Emergency Aid" icon="flash-outline" color="#dc2626" onClose={onClose}>
      <View style={emergencyBanner.wrap}>
        <Ionicons name="information-circle" size={18} color="#dc2626" />
        <Text style={emergencyBanner.text}>
          You are not alone. 59% of students face basic needs insecurity. Help is available.
        </Text>
      </View>

      <Text style={field.label}>Type of Emergency</Text>
      <View style={[chip.row, { flexWrap: "wrap" }]}>
        {EMERGENCY_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[chip.btn, emergencyType === t && { ...chip.active, backgroundColor: "#fef2f2", borderColor: "#dc2626" }]}
            onPress={() => setEmergencyType(t === emergencyType ? "" : t)}
          >
            <Text style={[chip.text, emergencyType === t && { color: "#dc2626" }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[field.label, { marginTop: 12 }]}>Urgency Level</Text>
      <View style={chip.row}>
        {URGENCY.map((u) => (
          <TouchableOpacity
            key={u}
            style={[chip.btn, urgency === u && chip.active]}
            onPress={() => setUrgency(u)}
          >
            <Text style={[chip.text, urgency === u && chip.activeText]}>
              {u.charAt(0).toUpperCase() + u.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Your School (optional)" value={school} onChangeText={setSchool} placeholder="e.g. Ohio State University" />
      <Field label="Additional context (optional)" value={context} onChangeText={setContext} placeholder="Any other details that might help..." multiline />

      <ActionButton title="Find Emergency Resources" onPress={find} loading={loading} color="#dc2626" />
      {result && <ResultBox text={result} />}
    </ModalShell>
  );
}

// ── 7. Proof of Funds Planner ─────────────────────────────────────────────────

function ProofOfFundsModal({ onClose }: { onClose: () => void }) {
  const [visaType, setVisaType] = useState("F-1");
  const [school, setSchool] = useState("");
  const [coa, setCoa] = useState("");
  const [years, setYears] = useState("1");
  const [funds, setFunds] = useState("0");
  const [country, setCountry] = useState("");
  const [result, setResult] = useState<{ total_needed: number; gap: number; plan: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const plan = async () => {
    if (!coa || isNaN(parseFloat(coa))) {
      Alert.alert("Error", "Please enter annual cost of attendance");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await proofOfFundsPlan({
        visa_type: visaType,
        school_name: school,
        annual_coa: parseFloat(coa),
        duration_years: parseInt(years) || 1,
        current_funds: parseFloat(funds) || 0,
        country_of_origin: country,
      });
      setResult({ total_needed: res.data.total_needed, gap: res.data.gap, plan: res.data.plan });
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Proof of Funds" icon="card-outline" color="#0d9488" onClose={onClose}>
      <Text style={field.label}>Visa Type</Text>
      <View style={chip.row}>
        {["F-1", "J-1"].map((v) => (
          <TouchableOpacity
            key={v}
            style={[chip.btn, visaType === v && chip.active]}
            onPress={() => setVisaType(v)}
          >
            <Text style={[chip.text, visaType === v && chip.activeText]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="School Name (optional)" value={school} onChangeText={setSchool} placeholder="e.g. Purdue University" />
      <Field label="Annual Cost of Attendance ($)" value={coa} onChangeText={setCoa} keyboardType="decimal-pad" placeholder="e.g. 55000" />
      <Field label="Duration (years)" value={years} onChangeText={setYears} keyboardType="numeric" placeholder="1" />
      <Field label="Funds Currently Available ($)" value={funds} onChangeText={setFunds} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Country of Origin (optional)" value={country} onChangeText={setCountry} placeholder="e.g. Iran, China, India" />

      {result && (
        <View style={gapCard.container}>
          <Text style={gapCard.label}>Total Funds Needed</Text>
          <Text style={[gapCard.amount, { color: "#0d9488" }]}>${result.total_needed.toLocaleString()}</Text>
          {result.gap > 0 && (
            <>
              <Text style={[gapCard.label, { marginTop: 6 }]}>Funding Gap</Text>
              <Text style={[gapCard.amount, { color: "#dc2626", fontSize: 22 }]}>${result.gap.toLocaleString()}</Text>
            </>
          )}
          {result.gap === 0 && (
            <Text style={[gapCard.label, { color: "#16a34a", marginTop: 6 }]}>Fully funded!</Text>
          )}
        </View>
      )}

      <ActionButton title="Generate Plan" onPress={plan} loading={loading} color="#0d9488" />
      {result && <ResultBox text={result.plan} />}
    </ModalShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bgBlob1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: `${colors.primary}09`,
  },
  bgBlob2: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#7c3aed09",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    color: colors.onSurface,
    letterSpacing: -1,
    fontStyle: "italic",
  },
  headerSub: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["3xl"],
    padding: 20,
    ...shadows.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}30`,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 17,
    color: colors.onSurface,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});

const modalShell = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}30`,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
    color: colors.onSurface,
    flex: 1,
  },
  scroll: { padding: 20, paddingBottom: 60 },
});

const resultBox = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  text: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 22,
  },
});

const actionBtn = StyleSheet.create({
  btn: { borderRadius: borderRadius.full, overflow: "hidden", marginTop: 20 },
  gradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: "Manrope_700Bold", fontSize: 16, color: "#fff" },
});

const field = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: colors.onSurface,
  },
});

const chip = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "nowrap", marginBottom: 14, gap: 8 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "transparent",
  },
  active: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  text: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: colors.onSurfaceVariant },
  activeText: { color: colors.primary },
});

const gapCard = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  amount: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    letterSpacing: -1,
    marginTop: 4,
  },
});

const emergencyBanner = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
  },
  text: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: "#7f1d1d",
    flex: 1,
    lineHeight: 20,
  },
});
