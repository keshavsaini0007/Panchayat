import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, Menu, X, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLinks = () => {
    if (!user) return [];
    switch (user.role) {
      case 'citizen':
        return [
          { label: 'Home', path: '/' },
          { label: 'Submit Complaint', path: '/submit' },
          { label: 'My Complaints', path: '/my-complaints' },
        ];
      case 'ward_member':
      case 'gram_pradhan':
        return [
          { label: 'Home', path: '/' },
          { label: 'Ward Dashboard', path: '/ward-dashboard' },
        ];
      case 'admin':
        return [
          { label: 'Home', path: '/' },
          { label: 'Admin Dashboard', path: '/admin' },
          { label: 'Manage Users', path: '/admin/users' },
        ];
      default:
        return [{ label: 'Home', path: '/' }];
    }
  };

  const links = roleLinks();

  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Landmark size={28} />
            Panchayat
          </Link>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <Link key={l.path} to={l.path} className="hover:text-green-200 transition">
                {l.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm">{user.name}</span>
                <span className="bg-green-500 text-xs px-2 py-0.5 rounded-full capitalize">
                  {user.role.replace('_', ' ')}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm transition"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="bg-white text-green-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-green-50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-green-500 hover:bg-green-600 px-4 py-1.5 rounded text-sm font-medium transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-green-800 px-4 pb-4 space-y-2">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="block py-1 hover:text-green-200"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="flex items-center gap-2 py-1 text-sm">
                <span>{user.name}</span>
                <span className="bg-green-500 text-xs px-2 py-0.5 rounded-full capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <div className="flex gap-3 pt-1">
              <Link
                to="/login"
                className="bg-white text-green-700 px-4 py-1.5 rounded text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-green-500 px-4 py-1.5 rounded text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
