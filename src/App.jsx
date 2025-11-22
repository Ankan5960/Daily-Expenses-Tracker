import { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Save,
  PieChart,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Loader2,
  Menu,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const appId = import.meta.env.VITE_APP_ID || "default-app-id";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CATEGORIES = {
  Debit: [
    "Food",
    "Rent",
    "EMI",
    "Travel",
    "Bills",
    "Entertainment",
    "Health",
    "Shopping",
  ],
  Credit: ["Salary", "Freelance", "Refunds", "Investment", "Gift"],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Debit");
  const [category, setCategory] = useState("Food");
  const [notification, setNotification] = useState(null);

  // 1. Authentication (Runs once)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Sync (Runs when user changes)
  useEffect(() => {
    if (!user) return;

    // Path: /artifacts/{appId}/users/{userId}/transactions
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "transactions")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort in memory (Newest first)
        data.sort(
          (a, b) =>
            new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt
        );

        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Data fetch error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Calculations
  const stats = useMemo(() => {
    const totalCredit = transactions
      .filter((t) => t.type === "Credit")
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const totalDebit = transactions
      .filter((t) => t.type === "Debit")
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const savings = totalCredit - totalDebit;

    const byCategory = transactions.reduce((acc, curr) => {
      if (!acc[curr.category]) acc[curr.category] = 0;
      acc[curr.category] += Number(curr.amount);
      return acc;
    }, {});

    return { totalCredit, totalDebit, savings, byCategory };
  }, [transactions]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !user) return;

    const newTransaction = {
      type,
      category,
      amount: Number(amount),
      date: new Date().toISOString().split("T")[0],
      createdAt: Date.now(), // for sorting
    };

    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "transactions"),
        newTransaction
      );
      setAmount("");
      showNotification("Saved to cloud!");
      setActiveTab("dashboard");
    } catch (err) {
      console.error(err);
      showNotification("Error saving data");
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "transactions", id)
      );
      showNotification("Deleted");
    } catch (err) {
      console.error(err);
      showNotification("Error deleting");
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatMoney = (num) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-blue-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start md:items-center font-sans p-0 md:p-6">
      {/* Main App Container - Responsive Size */}
      <div className="w-full h-screen md:h-[90vh] md:max-w-6xl md:rounded-[2.5rem] bg-white shadow-2xl flex flex-col-reverse md:flex-row relative overflow-hidden border-gray-200 md:border">
        
        {/* Navigation: Bottom on Mobile, Sidebar on Desktop */}
        <div className="bg-white border-t md:border-t-0 md:border-r border-gray-100 flex md:flex-col justify-around md:justify-center items-center py-3 md:py-0 md:w-24 z-20 shrink-0 gap-0 md:gap-10">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === "dashboard" ? "text-blue-600" : "text-gray-400 hover:text-blue-400"
            }`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-bold hidden md:block mt-1">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className="md:order-last -mt-8 md:mt-0 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-300 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"
          >
            <PlusCircle size={28} />
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === "history" ? "text-blue-600" : "text-gray-400 hover:text-blue-400"
            }`}
          >
            <TrendingUp size={24} />
            <span className="text-[10px] font-bold hidden md:block mt-1">Report</span>
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Header */}
          <div className="bg-blue-600 text-white p-6 pb-10 md:p-10 md:pb-16 rounded-b-[2.5rem] md:rounded-bl-[3rem] md:rounded-br-none shadow-lg z-10 shrink-0">
            <div className="flex justify-between items-center mb-4 md:mb-8 max-w-4xl mx-auto">
              <div>
                <h1 className="text-xl md:text-2xl font-bold opacity-90">Tracker App</h1>
                <p className="text-blue-100 text-xs md:text-sm flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Cloud Sync Active
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-500 rounded-full flex items-center justify-center shadow-inner">
                <Wallet size={20} className="md:w-6 md:h-6" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-blue-200 text-sm md:text-base font-medium mb-2">
                Total Savings
              </p>
              <h2 className="text-4xl md:text-6xl font-bold">{formatMoney(stats.savings)}</h2>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 -mt-6 pt-8 pb-24 md:pb-10 px-4 md:px-8">
            <div className="max-w-5xl mx-auto h-full">
              
              {activeTab === "dashboard" && (
                <div className="space-y-6 md:space-y-8 h-full flex flex-col">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2 text-green-600">
                        <div className="p-1.5 bg-green-100 rounded-full">
                          <ArrowUpRight size={16} />
                        </div>
                        <span className="text-xs font-bold uppercase">Income</span>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-gray-800">
                        {formatMoney(stats.totalCredit)}
                      </p>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2 text-red-500">
                        <div className="p-1.5 bg-red-100 rounded-full">
                          <ArrowDownLeft size={16} />
                        </div>
                        <span className="text-xs font-bold uppercase">Expense</span>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-gray-800">
                        {formatMoney(stats.totalDebit)}
                      </p>
                    </div>
                  </div>

                  {/* Desktop Grid for Charts & List */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    
                    {/* Category Breakdown */}
                    <div className="lg:col-span-1">
                      <h3 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
                        <PieChart size={18} className="text-blue-500" />
                        Breakdown
                      </h3>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {Object.entries(stats.byCategory).map(([cat, val], idx) => (
                          <div
                            key={cat}
                            className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  idx % 2 === 0 ? "bg-blue-400" : "bg-purple-400"
                                }`}
                              ></div>
                              <span className="text-gray-600 font-medium text-sm md:text-base">{cat}</span>
                            </div>
                            <span className="font-bold text-gray-800 text-sm md:text-base">
                              {formatMoney(val)}
                            </span>
                          </div>
                        ))}
                        {Object.keys(stats.byCategory).length === 0 && (
                          <div className="p-6 text-center text-gray-400 text-sm">
                            No data yet
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="lg:col-span-2">
                      <h3 className="text-gray-800 font-bold mb-3">
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {transactions.slice(0, 10).map((t) => (
                          <div
                            key={t.id}
                            className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-3 md:gap-4">
                              <div
                                className={`p-2 rounded-full ${
                                  t.type === "Credit"
                                    ? "bg-green-50 text-green-600"
                                    : "bg-red-50 text-red-500"
                                }`}
                              >
                                {t.type === "Credit" ? (
                                  <TrendingUp size={18} />
                                ) : (
                                  <TrendingDown size={18} />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm md:text-base">
                                  {t.category}
                                </p>
                                <p className="text-xs text-gray-400">{t.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 md:gap-6">
                              <span
                                className={`font-bold text-sm md:text-base ${
                                  t.type === "Credit"
                                    ? "text-green-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {t.type === "Credit" ? "+" : "-"}
                                {formatMoney(t.amount)}
                              </span>
                              <button
                                onClick={() => deleteTransaction(t.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {transactions.length === 0 && (
                          <div className="text-center text-gray-400 py-8 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                            No transactions found. Add one!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "add" && (
                <div className="pt-2 md:pt-6 flex justify-center">
                  <div className="w-full max-w-xl bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8 text-center">
                      Add New Transaction
                    </h2>
                    <form onSubmit={handleAddTransaction} className="space-y-6 md:space-y-8">
                      {/* Type Selector */}
                      <div className="grid grid-cols-2 bg-gray-100 p-1.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setType("Debit");
                            setCategory(CATEGORIES.Debit[0]);
                          }}
                          className={`py-3 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all ${
                            type === "Debit"
                              ? "bg-white text-red-500 shadow-sm"
                              : "text-gray-500 hover:bg-gray-200/50"
                          }`}
                        >
                          Expense
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setType("Credit");
                            setCategory(CATEGORIES.Credit[0]);
                          }}
                          className={`py-3 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all ${
                            type === "Credit"
                              ? "bg-white text-green-600 shadow-sm"
                              : "text-gray-500 hover:bg-gray-200/50"
                          }`}
                        >
                          Income
                        </button>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                          Amount
                        </label>
                        <div className="relative group">
                          <DollarSign
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                          />
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg font-bold text-gray-800"
                            required
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                          Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {CATEGORIES[type].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategory(cat)}
                              className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                                category === cat
                                  ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm transform scale-105"
                                  : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/30"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                      >
                        <Save size={20} />
                        Save Record
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Reuse Dashboard logic for History tab but full width */}
              {activeTab === "history" && (
                 <div className="space-y-6 md:space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h2 className="text-xl font-bold text-gray-800 mb-6">Full Transaction History</h2>
                      <div className="space-y-3">
                        {transactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50"
                          >
                             <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${t.type === "Credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                                    {t.type === "Credit" ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-700">{t.category}</p>
                                    <p className="text-xs text-gray-400">{t.date}</p>
                                </div>
                             </div>
                             <span className={`font-bold ${t.type === "Credit" ? "text-green-600" : "text-gray-800"}`}>
                                {t.type === "Credit" ? "+" : "-"}{formatMoney(t.amount)}
                             </span>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
              )}
            </div>
          </div>
        </div>

        {notification && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce z-50 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {notification}
          </div>
        )}
      </div>
    </div>
  );
}
