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
      currency: "USD",
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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-0 sm:pt-10 font-sans">
      <div className="w-full sm:w-[400px] bg-white h-screen sm:h-[800px] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border-gray-200 sm:border">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 pb-10 rounded-b-[2.5rem] shadow-lg z-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold opacity-90">Tracker App</h1>
              <p className="text-blue-100 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Cloud Sync Active
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center shadow-inner">
              <Wallet size={20} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-blue-200 text-sm font-medium mb-1">
              Total Savings
            </p>
            <h2 className="text-4xl font-bold">{formatMoney(stats.savings)}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 pb-20 -mt-4 pt-6">
          {activeTab === "dashboard" && (
            <div className="px-5 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2 text-green-600">
                    <div className="p-1.5 bg-green-100 rounded-full">
                      <ArrowUpRight size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase">Income</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    {formatMoney(stats.totalCredit)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2 text-red-500">
                    <div className="p-1.5 bg-red-100 rounded-full">
                      <ArrowDownLeft size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase">Expense</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    {formatMoney(stats.totalDebit)}
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div>
                <h3 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
                  <PieChart size={18} className="text-blue-500" />
                  Category Breakdown
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {Object.entries(stats.byCategory).map(([cat, val], idx) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            idx % 2 === 0 ? "bg-blue-400" : "bg-purple-400"
                          }`}
                        ></div>
                        <span className="text-gray-600 font-medium">{cat}</span>
                      </div>
                      <span className="font-bold text-gray-800">
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
              <div>
                <h3 className="text-gray-800 font-bold mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
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
                          <p className="font-semibold text-gray-800 text-sm">
                            {t.category}
                          </p>
                          <p className="text-xs text-gray-400">{t.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold text-sm ${
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
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center text-gray-400 py-4 text-sm">
                      No transactions found. Add one!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "add" && (
            <div className="px-5 pt-2">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Add Transaction
                </h2>
                <form onSubmit={handleAddTransaction} className="space-y-6">
                  {/* Type Selector */}
                  <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setType("Debit");
                        setCategory(CATEGORIES.Debit[0]);
                      }}
                      className={`py-3 rounded-lg text-sm font-bold transition-all ${
                        type === "Debit"
                          ? "bg-white text-red-500 shadow-sm"
                          : "text-gray-500"
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
                      className={`py-3 rounded-lg text-sm font-bold transition-all ${
                        type === "Credit"
                          ? "bg-white text-green-600 shadow-sm"
                          : "text-gray-500"
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
                    <div className="relative">
                      <DollarSign
                        size={20}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-gray-800"
                        required
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                      Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES[type].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                            category === cat
                              ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Save Record
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 flex justify-around items-center py-3 pb-5 z-20">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1 ${
              activeTab === "dashboard" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className="mb-8 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-300 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"
          >
            <PlusCircle size={28} />
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 ${
              activeTab === "history" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <TrendingUp size={24} />
            <span className="text-[10px] font-bold">Reports</span>
          </button>
        </div>

        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce z-50">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
}
