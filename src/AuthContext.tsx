import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  isAdmin: () => boolean;
  isCoach: () => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  loading: true,
  isAdmin: () => false,
  isCoach: () => false,
  isAuthenticated: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = () => role === 'admin';
  const isCoach = () => role === 'coach';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // Immediate role assignment for admin based on email
          if (user.email === 'karam.3bedat@gmail.com') {
            setRole('admin');
          }

          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Force admin role if email matches the admin email
            if (user.email === 'karam.3bedat@gmail.com' && userData.role !== 'admin') {
              await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
              setRole('admin');
            } else if (user.email !== 'karam.3bedat@gmail.com') {
              setRole(userData.role);
            }
          } else {
            // Default role for new users
            const defaultRole = user.email === 'karam.3bedat@gmail.com' ? 'admin' : 'coach';
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              role: defaultRole,
              displayName: user.displayName || '',
              createdAt: new Date().toISOString()
            });
            setRole(defaultRole);
          }
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
        // Even if firestore fails, if it's the admin email, keep the role
        if (user?.email === 'karam.3bedat@gmail.com') {
          setRole('admin');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      isAdmin, 
      isCoach, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
