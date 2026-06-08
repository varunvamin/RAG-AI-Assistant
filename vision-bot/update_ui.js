const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Epsilon.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update imports
if (!content.includes('import { useTheme }')) {
  content = content.replace(
    'import { Send, Menu,',
    'import { useTheme } from "next-themes";\nimport { Send, Menu,'
  );
}
if (!content.includes('Palette') && content.includes('import { Send')) {
  content = content.replace('import { Send, Menu, Sparkles,', 'import { Send, Menu, Sparkles, Palette, Moon, Sun,');
}

// 2. Inject useTheme hook inside Epsilon component
if (!content.includes('const { theme, setTheme } = useTheme();')) {
  content = content.replace(
    'const [authError, setAuthError] = useState("");',
    `const [authError, setAuthError] = useState("");\n  const { theme, setTheme } = useTheme();\n  const [showThemeMenu, setShowThemeMenu] = useState(false);\n  const changeAccent = (color) => { document.documentElement.style.setProperty('--primary', color); };`
  );
}

// 3. Replace Auth Submit logic
const authRegex = /const handleAuthSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?\}\s*else\s*\{\s*setAuthError\("Invalid username or password\."\);\s*\}\s*\}\s*else\s*\{[\s\S]*?setThreadTitles\(\{\}\);\s*\}\s*\}\s*\};/;

const newAuthLogic = `const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("All fields are required.");
      return;
    }
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }
      
      setCurrentUser(data.user.username);
      localStorage.setItem("epsilon_current_user", data.user.username);
      if (data.user.theme) setTheme(data.user.theme);
      if (data.user.accent_color) document.documentElement.style.setProperty('--primary', data.user.accent_color);
      
      if (authMode === 'signup') {
        setThreads({ general: [], flashcard: [], solver: [], coder: [] });
        setPastChats([]);
        setSavedItems([]);
        setThreadTitles({});
      } else {
        loadUserProfile(data.user.username);
      }
    } catch (err) {
      setAuthError("Network error. Please try again.");
    }
  };`;

content = content.replace(authRegex, newAuthLogic);

// 4. Update Tailwind UI Classes
content = content.replace(/bg-white/g, 'bg-card');
content = content.replace(/text-gray-800/g, 'text-foreground');
content = content.replace(/text-gray-900/g, 'text-foreground');
content = content.replace(/text-gray-500/g, 'text-muted-foreground');
content = content.replace(/text-gray-400/g, 'text-muted-foreground');
content = content.replace(/text-gray-600/g, 'text-muted-foreground');
content = content.replace(/bg-gray-50/g, 'bg-muted');
content = content.replace(/bg-gray-100/g, 'bg-muted');
content = content.replace(/border-gray-100/g, 'border-border');
content = content.replace(/border-gray-200/g, 'border-border');
content = content.replace(/ring-gray-200/g, 'ring-border');
content = content.replace(/text-blue-500/g, 'text-primary');
content = content.replace(/text-blue-600/g, 'text-primary');
content = content.replace(/bg-blue-500/g, 'bg-primary');
content = content.replace(/bg-blue-600/g, 'bg-primary');
content = content.replace(/hover:bg-blue-50/g, 'hover:bg-muted');

// 5. Add Theme Menu to Sidebar
const themeMenuHTML = `
            {/* Theme Toggle Button */}
            <div className="absolute bottom-20 w-full px-4">
              <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="w-full flex items-center justify-between p-3 rounded-xl bg-muted text-foreground hover:bg-card border border-border transition-all">
                <div className="flex items-center gap-3">
                  <Palette size={18} className="text-primary" />
                  <span className="font-semibold text-sm">Theme Settings</span>
                </div>
              </button>
              {showThemeMenu && (
                <div className="absolute bottom-14 left-4 w-56 bg-card border border-border shadow-xl rounded-xl p-3 z-50">
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Mode</p>
                    <div className="flex gap-2">
                      <button onClick={() => setTheme('light')} className="flex-1 py-1.5 flex justify-center bg-muted rounded-lg hover:bg-border"><Sun size={14}/></button>
                      <button onClick={() => setTheme('dark')} className="flex-1 py-1.5 flex justify-center bg-muted rounded-lg hover:bg-border"><Moon size={14}/></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Accent Color</p>
                    <div className="flex gap-2">
                      <button onClick={() => changeAccent('#8b5cf6')} className="w-6 h-6 rounded-full bg-violet-500"></button>
                      <button onClick={() => changeAccent('#10b981')} className="w-6 h-6 rounded-full bg-emerald-500"></button>
                      <button onClick={() => changeAccent('#f59e0b')} className="w-6 h-6 rounded-full bg-amber-500"></button>
                      <button onClick={() => changeAccent('#ef4444')} className="w-6 h-6 rounded-full bg-red-500"></button>
                      <button onClick={() => changeAccent('#3b82f6')} className="w-6 h-6 rounded-full bg-blue-500"></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
`;

// Insert the theme menu before the logout button in the sidebar
if (!content.includes('Theme Settings')) {
  content = content.replace(
    '<button onClick={handleLogout}',
    themeMenuHTML + '\n            <button onClick={handleLogout}'
  );
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Refactoring complete");
