import Admin from './pages/Admin';
import Legal from './pages/Legal';

import BasketDetail from './pages/BasketDetail';
import CreateBasket from './pages/CreateBasket';
import CreateMaraude from './pages/CreateMaraude';
import Favorites from './pages/Favorites';
import Home from './pages/Home';
import MaraudeDetail from './pages/MaraudeDetail';
import Maraudes from './pages/Maraudes';
import Messages from './pages/Messages';
import MyBaskets from './pages/MyBaskets';
import Profile from './pages/Profile';
import SellerProfile from './pages/SellerProfile';
import Transactions from './pages/Transactions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BasketDetail": BasketDetail,
    "CreateBasket": CreateBasket,
    "CreateMaraude": CreateMaraude,
    "Favorites": Favorites,
    "Home": Home,
    "MaraudeDetail": MaraudeDetail,
    "Maraudes": Maraudes,
    "Messages": Messages,
    "MyBaskets": MyBaskets,
    "Profile": Profile,
    "SellerProfile": SellerProfile,
    "Transactions": Transactions,
    "Legal": Legal,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};