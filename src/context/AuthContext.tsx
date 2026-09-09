import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, UserRole } from '../types';
import { verifyPin, hashPin } from '../utils/crypto';
import { getOrInitializeUsers, saveUsers } from '../db/indexedDb';
import { INITIAL_USERS } from '../db/initialData';
import { getApiUrl, getAuthToken, setAuthToken, getAuthHeaders } from '../services/apiConfig';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isManager: boolean;
  isAssistantManager: boolean;
  isStaff: boolean;
  users: UserProfile[];
  loginModalOpen: boolean;
  targetRoleForLogin: UserRole | null;
  targetUserForLogin: UserProfile | null;
  openLoginModal: (userOrRole: UserProfile | UserRole) => void;
  closeLoginModal: () => void;
  attemptLogin: (target: UserProfile | UserRole | string, pin: string | number) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  lockApp: () => void;
  updateUserPin: (userIdOrRole: string, newPin: string | number) => Promise<boolean>;
  updateUserName: (userIdOrRole: string, newName: string) => Promise<boolean>;
  addNewUser: (params: { name: string; role: UserRole; pin: string | number }) => Promise<boolean>;
  registerStaffProfile: (params: {
    name: string;
    photo?: string;
    company: 'luckycat' | 'JPE KTV' | string;
    division: string;
    role: UserRole;
    pin: string | number;
    venueId?: string;
    assignedVenueIds?: string[];
    assignedAreaIds?: string[];
  }) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  refreshUsers: () => Promise<void>;
  deleteUser: (userId: string) => Promise<boolean>;
  setUsersList: (users: UserProfile[]) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  initialUsers?: UserProfile[];
  initialAutoLockMinutes?: number;
  children: React.ReactNode;
}> = ({ initialUsers, initialAutoLockMinutes = 5, children }) => {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers && initialUsers.length > 0 ? initialUsers : INITIAL_USERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [targetRoleForLogin, setTargetRoleForLogin] = useState<UserRole | null>(null);
  const [targetUserForLogin, setTargetUserForLogin] = useState<UserProfile | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState(initialAutoLockMinutes);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Initialize and load users and existing session on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // 1. Try to load public user directory from server
        try {
          const res = await fetch(getApiUrl('/api/auth/users'));
          if (res.ok) {
            const serverUsers = await res.json();
            if (isMounted && Array.isArray(serverUsers) && serverUsers.length > 0) {
              const cleanUsers = serverUsers.filter((u: any) => !u.name?.toLowerCase().includes('test device'));
              setUsers(cleanUsers);
            }
          }
        } catch {
          // Fallback to local users if server not yet connected
          const loadedUsers = await getOrInitializeUsers();
          if (isMounted && loadedUsers && loadedUsers.length > 0) {
            const cleanUsers = loadedUsers.filter((u: any) => !u.name?.toLowerCase().includes('test device'));
            setUsers(cleanUsers);
          }
        }

        // 2. Validate existing token session
        const existingToken = getAuthToken();
        if (existingToken) {
          try {
            const meRes = await fetch(getApiUrl('/api/auth/me'), {
              headers: { Authorization: `Bearer ${existingToken}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (isMounted && meData.user) {
                setCurrentUser({
                  id: meData.user.userId,
                  name: meData.user.name,
                  role: meData.user.role,
                  venueId: meData.user.venueId
                } as any);
              }
            } else {
              setAuthToken(null);
            }
          } catch {
            // Keep existing state or clear
          }
        }
      } catch (err) {
        console.error('Error loading users in AuthContext:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const lockApp = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    setLoginModalOpen(false);
    setTargetRoleForLogin(null);
    setTargetUserForLogin(null);
  }, []);

  const logout = useCallback(() => {
    lockApp();
  }, [lockApp]);

  // Activity tracker for inactivity timeout
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (!currentUser || autoLockMinutes <= 0) return;
      const elapsedMs = Date.now() - lastActivityRef.current;
      const maxMs = autoLockMinutes * 60 * 1000;
      if (elapsedMs >= maxMs) {
        console.log(`Auto-locking application due to ${autoLockMinutes}m inactivity.`);
        lockApp();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentUser, autoLockMinutes, lockApp]);

  const openLoginModal = (target: UserProfile | UserRole) => {
    if (typeof target === 'object' && target !== null && 'id' in target) {
      setTargetUserForLogin(target);
      setTargetRoleForLogin(target.role);
    } else {
      setTargetUserForLogin(null);
      setTargetRoleForLogin(target as UserRole);
    }
    setLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setTargetRoleForLogin(null);
    setTargetUserForLogin(null);
  };

  const attemptLogin = async (target: UserProfile | UserRole | string, pin: string | number): Promise<{ success: boolean; error?: string }> => {
    const cleanPin = String(pin !== undefined && pin !== null ? pin : '').trim();
    if (!cleanPin) {
      return { success: false, error: 'Please enter a PIN.' };
    }

    // Ensure we have active users list loaded
    let activeUsers = users;
    if (!activeUsers || activeUsers.length === 0) {
      activeUsers = await getOrInitializeUsers();
      setUsers(activeUsers);
    }

    const isSpecificUser = typeof target === 'object' && target !== null && 'id' in target;
    const roleTarget = isSpecificUser 
      ? target.role 
      : (typeof target === 'string' ? target : targetRoleForLogin || 'STAFF');

    // Authoritative Server PIN Verification & Token Issuance
    try {
      const loginPayload: any = {
        pin: cleanPin,
        venueId: 'venue-default'
      };

      if (isSpecificUser) {
        loginPayload.userId = target.id;
        loginPayload.role = target.role;
      } else {
        loginPayload.role = roleTarget;
      }

      const loginRes = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(loginPayload)
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.ok && loginData.token) {
          setAuthToken(loginData.token);
          const authedUser: UserProfile = {
            id: loginData.user.id,
            name: loginData.user.name,
            role: loginData.user.role,
            venueId: loginData.user.venueId,
            photo: loginData.user.photo || (isSpecificUser ? target.photo : undefined),
            company: loginData.user.company || (isSpecificUser ? target.company : (loginData.user.role === 'STAFF' ? 'luckycat' : 'JPE KTV')),
            division: loginData.user.division || (isSpecificUser ? target.division : 'Floor Operations'),
            status: 'ACTIVE'
          } as any;
          setCurrentUser(authedUser);
          setLoginModalOpen(false);
          setTargetRoleForLogin(null);
          setTargetUserForLogin(null);
          lastActivityRef.current = Date.now();
          return { success: true };
        }
      } else {
        const errData = await loginRes.json().catch(() => ({ error: 'Incorrect PIN. Please try again.' }));
        return { success: false, error: errData.error || 'Incorrect PIN. Please try again.' };
      }
    } catch {
      // Local fallback if offline: check all candidate users matching role
      const candidateList = isSpecificUser
        ? activeUsers.filter(u => u.id === target.id)
        : activeUsers.filter(u => u.role === roleTarget);

      for (const cand of candidateList) {
        if (cand.pinHash) {
          const isValid = await verifyPin(cleanPin, cand.pinHash);
          if (isValid) {
            setCurrentUser(cand);
            setLoginModalOpen(false);
            setTargetRoleForLogin(null);
            setTargetUserForLogin(null);
            lastActivityRef.current = Date.now();
            return { success: true };
          }
        }
      }
      return { success: false, error: 'Incorrect PIN. Please try again.' };
    }
    return { success: false, error: 'Authentication service unreachable.' };
  };

  const updateUserPin = async (userIdOrRole: string, newPin: string | number): Promise<boolean> => {
    const cleanPin = String(newPin !== undefined && newPin !== null ? newPin : '').trim();
    if (!cleanPin || cleanPin.length < 4) return false;

    const newHash = await hashPin(cleanPin);
    const updatedUsers = users.map(u => {
      if (u.id === userIdOrRole || u.role === userIdOrRole) {
        return { ...u, pinHash: newHash, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    setUsers(updatedUsers);
    await saveUsers(updatedUsers);

    if (currentUser && (currentUser.id === userIdOrRole || currentUser.role === userIdOrRole)) {
      setCurrentUser(prev => prev ? { ...prev, pinHash: newHash } : null);
    }
    return true;
  };

  const updateUserName = async (userIdOrRole: string, newName: string): Promise<boolean> => {
    if (!newName.trim()) return false;
    const updatedUsers = users.map(u => {
      if (u.id === userIdOrRole || u.role === userIdOrRole) {
        return { ...u, name: newName.trim(), updatedAt: new Date().toISOString() };
      }
      return u;
    });

    setUsers(updatedUsers);
    await saveUsers(updatedUsers);

    if (currentUser && (currentUser.id === userIdOrRole || currentUser.role === userIdOrRole)) {
      setCurrentUser(prev => prev ? { ...prev, name: newName.trim() } : null);
    }
    return true;
  };

  const addNewUser = async (params: { name: string; role: UserRole; pin: string | number }): Promise<boolean> => {
    const cleanPin = String(params.pin !== undefined && params.pin !== null ? params.pin : '').trim();
    if (!params.name.trim() || cleanPin.length < 4) return false;

    const newHash = await hashPin(cleanPin);
    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: params.name.trim(),
      role: params.role,
      pinHash: newHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
    return true;
  };

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/users'));
      if (res.ok) {
        const serverUsers = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers);
          return;
        }
      }
    } catch {
      // Offline fallback
    }
    const loadedUsers = await getOrInitializeUsers();
    if (loadedUsers && loadedUsers.length > 0) {
      setUsers(loadedUsers);
    }
  }, []);

  const registerStaffProfile = async (params: {
    name: string;
    photo?: string;
    company: 'luckycat' | 'JPE KTV' | string;
    division: string;
    role: UserRole;
    pin: string | number;
    venueId?: string;
    assignedVenueIds?: string[];
    assignedAreaIds?: string[];
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    const cleanPin = String(params.pin !== undefined && params.pin !== null ? params.pin : '').trim();
    if (!params.name.trim()) return { success: false, error: 'Full name is required.' };
    if (cleanPin.length < 4) return { success: false, error: '4-digit numeric PIN is required.' };

    try {
      const res = await fetch(getApiUrl('/api/auth/register-staff'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: params.name.trim(),
          photo: params.photo || undefined,
          company: params.company || 'luckycat',
          division: params.division || 'Floor Operations',
          role: params.role || 'STAFF',
          pin: cleanPin,
          venueId: params.venueId || 'venue-default',
          assignedVenueIds: params.assignedVenueIds,
          assignedAreaIds: params.assignedAreaIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          const registeredUser: UserProfile = {
            id: data.user.id,
            name: data.user.name,
            role: data.user.role,
            photo: data.user.photo,
            company: data.user.company,
            division: data.user.division,
            venueId: data.user.venueId,
            assignedVenueIds: data.user.assignedVenueIds,
            assignedAreaIds: data.user.assignedAreaIds,
            hasAllVenueAccess: data.user.hasAllVenueAccess,
            status: 'ACTIVE'
          };
          setUsers(prev => [...prev.filter(u => u.id !== registeredUser.id), registeredUser]);
          await refreshUsers();
          return { success: true, user: registeredUser };
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Registration failed' }));
        return { success: false, error: err.error || 'Registration failed' };
      }
    } catch (err: any) {
      console.warn('Backend staff registration unreachable, falling back to local storage:', err);
    }

    // Local storage fallback if offline
    const newHash = await hashPin(cleanPin);
    const localUser: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: params.name.trim(),
      role: params.role || 'STAFF',
      photo: params.photo,
      company: params.company || 'luckycat',
      division: params.division || 'Floor Operations',
      pinHash: newHash,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedUsers = [...users, localUser];
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
    return { success: true, user: localUser };
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (users.length <= 1) return false;
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);
    return true;
  };

  const setUsersList = (newUsers: UserProfile[]) => {
    setUsers(newUsers);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        isLoading,
        isManager: currentUser?.role === 'MANAGER',
        isAssistantManager: currentUser?.role === 'ASSISTANT_MANAGER',
        isStaff: currentUser?.role === 'STAFF',
        users,
        loginModalOpen,
        targetRoleForLogin,
        targetUserForLogin,
        openLoginModal,
        closeLoginModal,
        attemptLogin,
        logout,
        lockApp,
        updateUserPin,
        updateUserName,
        addNewUser,
        registerStaffProfile,
        refreshUsers,
        deleteUser,
        setUsersList,
        autoLockMinutes,
        setAutoLockMinutes
      }}
    >
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
