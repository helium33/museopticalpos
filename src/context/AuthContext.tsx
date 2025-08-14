import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

type UserRole = 'admin' | 'staff' | 'owner' | 'readonly';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('staff');

  const adminEmails = [
    'kyawwinhtun564@gmail.com',
    'wpy.muse@gmail.com',
    'yannaing190792@gmail.com',

      

  ];

  // List of emails authorized to login
  const authorizedEmails = [
    ...adminEmails,
       'yannaing190791@gmail.com',


    'winstore1717@gmail.com',
    'chittulay2001@gmail.com',
    'ygnoptical@gmail.com',
    'pwintoptical@gmail.com',
    'winvision1717@gmail.com',
  ];

  // For showing in login fail error message
  const allowedEmailListForDisplay = authorizedEmails.join(', ');

  const logUserActivity = async (currentUser: User, action: 'Login' | 'Logout', authorized: boolean = true) => {
    try {
      const position = 'geolocation' in navigator ? 
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }) : null;

      const activityData = {
        action,
        details: authorized 
          ? action === 'Login'
            ? 'User logged in successfully'
            : 'User logged out successfully'
          : action === 'Login'
            ? 'Unauthorized login attempt'
            : 'Unauthorized logout attempt',
        staffId: currentUser.uid,
        staffEmail: currentUser.email,
        timestamp: serverTimestamp(),
        authorized,
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        ...(position && {
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        })
      };

      await addDoc(collection(db, 'activityLogs'), activityData);

      if (authorized) {
        await addDoc(collection(db, 'notifications'), {
          type: 'System',
          title: `User ${action}`,
          message: `${currentUser.email} ${action === 'Login' ? 'logged in' : 'logged out'} at ${new Date().toLocaleString()}`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(`Error logging ${action.toLowerCase()} activity:`, error);
    }
  };

  const checkUserAuthorization = async (email: string): Promise<boolean> => {
    if (authorizedEmails.includes(email)) return true;

    const staffQuery = query(
      collection(db, 'staff'),
      where('email', '==', email),
      where('active', '==', true)
    );

    const snapshot = await getDocs(staffQuery);
    return !snapshot.empty;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const isAuthorized = await checkUserAuthorization(currentUser.email || '');

        if (!isAuthorized) {
          await logUserActivity(currentUser, 'Login', false);
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          return;
        }

        await logUserActivity(currentUser, 'Login');

        let role: UserRole = 'staff';
        if (currentUser.email === 'yannaing190791@gmail.com') {
          role = 'owner';
        } else if (adminEmails.includes(currentUser.email || '')) {
          role = 'admin';
        } else if (authorizedEmails.includes(currentUser.email || '')) {
          const staffQuery = query(
            collection(db, 'staff'),
            where('email', '==', currentUser.email),
            where('readOnly', '==', true)
          );
          const snapshot = await getDocs(staffQuery);
          if (!snapshot.empty) {
            role = 'readonly';
          }
        }

        setIsAdmin(role === 'admin' || role === 'owner');
        setUserRole(role);
        setUser(currentUser);
      } else {
        setUser(null);
        setIsAdmin(false);
        setUserRole('staff');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);

      if (!result.user) {
        throw new Error('Login failed: No user returned.');
      }

      const isAuthorized = await checkUserAuthorization(result.user.email || '');

      if (!isAuthorized) {
        await logUserActivity(result.user, 'Login', false);
        await firebaseSignOut(auth);
        throw new Error('Unauthorized email. Please use your staff email address.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message || 'Login failed');
      } else {
        throw new Error('Login failed');
      }
    }
  };

  const loginWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const isAuthorized = await checkUserAuthorization(result.user.email || '');

    if (!isAuthorized) {
      await logUserActivity(result.user, 'Login', false);
      await firebaseSignOut(auth);
      throw new Error('Unauthorized email. Please use your staff email address.');
    }
  };

  const logout = async () => {
    if (user) {
      await logUserActivity(user, 'Logout');
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, userRole, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};