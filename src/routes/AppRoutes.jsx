import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Dashboard from "../pages/dashboard/Dashboard";
import ProductList from "../pages/products/ProductList";
import ProductCreate from "../pages/products/ProductCreate";
import ProductEdit from "../pages/products/ProductEdit";
import CategoryList from "../pages/categories/CategoryList";
import CategoryCreate from "../pages/categories/CategoryCreate";
import CategoryEdit from "../pages/categories/CategoryEdit";
import OrderList from "../pages/orders/OrderList";
import CustomerList from "../pages/customers/CustomerList";
import OfferList from "../pages/offers/OfferList";
import MessageList from "../pages/messages/MessageList";
import FavouriteList from "../pages/favourites/FavouriteList";
import Settings from "../pages/settings/Settings";
import Profile from "../pages/profile/Profile";
import ReviewList from "../pages/reviews/ReviewList";
import EmailLogList from "../pages/emailLogs/EmailLogList";
import EmailTemplateList from "../pages/emailTemplates/EmailTemplateList";
import EmailTemplateCreate from "../pages/emailTemplates/EmailTemplateCreate";
import EmailTemplateEdit from "../pages/emailTemplates/EmailTemplateEdit";
import EmailTemplateView from "../pages/emailTemplates/EmailTemplateView";
import HeroSliderList from "../pages/heroSliders/HeroSliderList";
import WhyChooseUsList from "../pages/whyChooseUs/WhyChooseUsList";
import TestimonialList from "../pages/testimonials/TestimonialList";
import ReelsList from "../pages/reels/ReelsList";
import CmsPageList from "../pages/cms/CmsPageList";
import CmsPageCreate from "../pages/cms/CmsPageCreate";
import CmsPageEdit from "../pages/cms/CmsPageEdit";
import IngredientList from "../pages/inventory/IngredientList";
import RecipeList from "../pages/inventory/RecipeList";
import SupplierList from "../pages/inventory/SupplierList";
import InventoryLogList from "../pages/inventory/InventoryLogList";
import StoreList from "../pages/stores/StoreList";
import StoreProductList from "../pages/stores/StoreProductList";
import StoreOrderList from "../pages/stores/StoreOrderList";
import StoreSetPassword from "../pages/auth/StoreSetPassword";
import StoreOwnerLocationSetup from "../pages/stores/StoreOwnerLocationSetup";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public / Unauthenticated Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/store/set-password" element={<StoreSetPassword />} />
      </Route>

      {/* Protected Admin Routes: Must be authenticated as admin to access any internal page */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/create" element={<ProductCreate />} />
          <Route path="products/:id/edit" element={<ProductEdit />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/create" element={<CategoryCreate />} />
          <Route path="categories/:id/edit" element={<CategoryEdit />} />
          <Route path="stores" element={<StoreList />} />
          <Route path="stores/:storeId/products" element={<StoreProductList />} />
          <Route path="stores/:storeId/orders" element={<StoreOrderList />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="offers" element={<OfferList />} />
          <Route path="reviews" element={<ReviewList />} />
          <Route path="messages" element={<MessageList />} />
          <Route path="email-logs" element={<EmailLogList />} />
          <Route path="email-templates" element={<EmailTemplateList />} />
          <Route path="email-templates/create" element={<EmailTemplateCreate />} />
          <Route path="email-templates/:id/edit" element={<EmailTemplateEdit />} />
          <Route path="email-templates/:id" element={<EmailTemplateView />} />
          <Route path="hero-sliders" element={<HeroSliderList />} />
          <Route path="why-choose-us" element={<WhyChooseUsList />} />
          <Route path="testimonials" element={<TestimonialList />} />
          <Route path="reels" element={<ReelsList />} />
          <Route path="cms-pages" element={<CmsPageList />} />
          <Route path="cms-pages/create" element={<CmsPageCreate />} />
          <Route path="cms-pages/:id/edit" element={<CmsPageEdit />} />
          <Route path="inventory/ingredients" element={<IngredientList />} />
          <Route path="inventory/recipes" element={<RecipeList />} />
          <Route path="inventory/suppliers" element={<SupplierList />} />
          <Route path="inventory/logs" element={<InventoryLogList />} />
          <Route path="favourites" element={<FavouriteList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="store-location" element={<StoreOwnerLocationSetup />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
