import { Routes, Route } from "react-router-dom";
import { useAdmin } from "./hooks/useAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import AddEditProduct from "./pages/AddEditProduct";
import Categories from "./pages/Categories";
import ShippingRates from "./pages/ShippingRates";
import PaymentSettings from "./pages/PaymentSettings";
import NotFound from "./pages/NotFound";

export default function App() {
  useAdmin(); // ← called once here only

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<AddEditProduct />} />
          <Route path="/products/:id/edit" element={<AddEditProduct />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/shipping" element={<ShippingRates />} />
          <Route path="/payment-settings" element={<PaymentSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}