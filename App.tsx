
import React, { useState, useEffect } from 'react';
import { Screen, Climb, BoulderSystem, RopeSystem, convertGrade } from './types';
import SplashScreen from './components/SplashScreen';
import Dashboard from './components/Dashboard';
import History from './components/History';
import LogClimb from './components/LogClimb';
import Analytics from './components/Analytics';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Leaderboard from './components/Leaderboard';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Splash);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-up' | 'sign-in'>('sign-up');

  // User Profile State
  const [userName, setUserName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(''); // New State
  const [boulderSystem, setBoulderSystem] = useState<BoulderSystem>('V-Scale');
  const [ropeSystem, setRopeSystem] = useState<RopeSystem>('YDS');

  const [homeGym, setHomeGym] = useState('Select Your Home Gym');
  const [savedGyms, setSavedGyms] = useState<string[]>([]);
  const [climbs, setClimbs] = useState<Climb[]>([]);

  const [session, setSession] = useState<any>(null);

  // Load profile from Supabase on mount/auth change
  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoggedIn(!!session);
      if (session) {
        fetchUserProfile(session.user.id);
        fetchUserClimbs(session.user.id);
        fetchUserGyms(session.user.id);
      }
    });

    // Listen for Auth Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoggedIn(!!session);

      if (session) {
        // User is logged in
        fetchUserProfile(session.user.id);
        fetchUserClimbs(session.user.id);
        fetchUserGyms(session.user.id);
        setShowAuth(false); // Close auth modal if open
      } else {
        // User logged out - STRICT CLEANUP
        setUserName('');
        setGender('');
        setBirthday('');
        setAvatarUrl('');
        setBoulderSystem('V-Scale');
        setRopeSystem('YDS');
        setHomeGym('Select Your Home Gym');
        setSavedGyms([]);
        setClimbs([]);
        setIsProfileSetupComplete(false);
      }
    });

    // Splash Screen Timer
    const timer = setTimeout(() => {
      // After splash, deciding where to go
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // NO SESSION -> Go to Profile (which shows Guest View with "Create Free Account")
          setCurrentScreen(Screen.Profile);
          setShowAuth(false);
        } else {
          setCurrentScreen(Screen.Home);
        }
      });
    }, 2500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUserName(data.display_name || '');
        setGender(data.gender || '');
        setBirthday(data.birthday || '');
        setAvatarUrl(data.avatar_url || ''); // Set avatar URL
        setBoulderSystem(data.boulder_system as BoulderSystem || 'V-Scale');
        setRopeSystem(data.rope_system as RopeSystem || 'YDS');
        setHomeGym(data.home_gym || 'Select Your Home Gym');

        // If we have a name, setup is considered allowed/done
        if (data.display_name) {
          setIsProfileSetupComplete(true);
        } else {
          setIsProfileSetupComplete(false);
        }
      } else {
        // No profile found? We need onboarding
        // ALSO RESET STATE to prevent ghost data from previous user if logout didn't catch it
        setUserName('');
        setGender('');
        setBirthday('');
        setAvatarUrl('');
        setBoulderSystem('V-Scale');
        setRopeSystem('YDS');
        setHomeGym('Select Your Home Gym');

        setIsProfileSetupComplete(false);
      }
    } catch (e) {
      console.error('Error fetching profile', e);
      // In case of error, ensuring we don't assume we are set up
      setIsProfileSetupComplete(false);
    }
  };

  const fetchUserClimbs = async (userId: string) => {
    const { data } = await supabase.from('climbs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setClimbs(data.map((c: any) => ({ ...c, imageUrl: c.image_url })));
  };

  const fetchUserGyms = async (userId: string) => {
    const { data } = await supabase.from('saved_gyms').select('gym_name').eq('user_id', userId);
    if (data) setSavedGyms(data.map((g: any) => g.gym_name));
  };


  const handleAddClimb = async (newClimb: Climb) => {
    setClimbs([newClimb, ...climbs]);
    setCurrentScreen(Screen.History);

    if (session?.user) {
      await supabase.from('climbs').insert([{
        user_id: session.user.id,
        name: newClimb.name,
        grade: newClimb.grade,
        gym: newClimb.gym,
        type: newClimb.type,
        date: newClimb.date,
        time: newClimb.time,
        duration: newClimb.duration,
        status: newClimb.status,
        image_url: newClimb.imageUrl
      }]);
    }
  };

  const toggleSavedGym = async (gymName: string) => {
    setSavedGyms(prev => prev.includes(gymName) ? prev.filter(g => g !== gymName) : [...prev, gymName]);

    if (session?.user) {
      if (savedGyms.includes(gymName)) {
        await supabase.from('saved_gyms').delete().eq('user_id', session.user.id).eq('gym_name', gymName);
      } else {
        await supabase.from('saved_gyms').insert([{ user_id: session.user.id, gym_name: gymName }]);
      }
    }
  };

  const handleOnboardingComplete = async (data: { name: string, gender: string, birthday: string, boulder: BoulderSystem, rope: RopeSystem, avatarUrl?: string }) => {
    setUserName(data.name);
    setGender(data.gender);
    setBirthday(data.birthday);
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl); // Handle avatar from Onboarding
    setBoulderSystem(data.boulder);
    setRopeSystem(data.rope);
    setIsProfileSetupComplete(true);

    if (session?.user) {
      // Save/Upsert profile
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        display_name: data.name,
        gender: data.gender,
        birthday: data.birthday,
        avatar_url: data.avatarUrl || null,
        boulder_system: data.boulder,
        rope_system: data.rope,
        home_gym: homeGym
      });
      if (error) console.error("Failed to save profile:", error);
    }
  };

  const updateProfile = async (updates: any) => {
    // Local State Update
    if (updates.display_name) setUserName(updates.display_name);
    if (updates.boulder_system) setBoulderSystem(updates.boulder_system);
    if (updates.rope_system) setRopeSystem(updates.rope_system);
    if (updates.home_gym) setHomeGym(updates.home_gym);
    if (updates.avatar_url) setAvatarUrl(updates.avatar_url);

    if (session?.user) {
      await supabase.from('profiles').update(updates).eq('id', session.user.id);
    }
  };


  const handleAuthComplete = (mode: 'sign-up' | 'sign-in') => {
    setShowAuth(false);
    // State updates handled by onAuthStateChange logic above
  };

  const handleLoginClick = (mode: 'sign-up' | 'sign-in') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentScreen(Screen.Profile); // Go back to guest profile view
    setShowAuth(false);
  };

  // Convert climbs on the fly for display
  const displayClimbs = climbs.map(c => ({
    ...c,
    grade: convertGrade(c.grade, c.type === 'Boulder' ? 'Boulder' : 'Rope', c.type === 'Boulder' ? boulderSystem : ropeSystem)
  }));

  const renderScreen = () => {
    // If Auth is showing (e.g. forced by no session), return Auth
    if (showAuth) {
      return <Auth initialMode={authMode} onAuthComplete={handleAuthComplete} onCancel={() => {
        // If user cancels Auth but IS NOT logged in, we technically shouldn't let them in?
        // But maybe they want to see Guest view? 
        // User said: "Open app -> Sign Up/In screen".
        // If they cancel, let's just keep them there or maybe Guest Mode?
        // Let's assume cancel allowed -> Guest Mode
        setShowAuth(false);
      }} />;
    }

    // PENDING ONBOARDING
    if (isLoggedIn && !isProfileSetupComplete) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    switch (currentScreen) {
      case Screen.Splash:
        return <SplashScreen />;
      case Screen.Home:
        return (
          <Dashboard
            userName={userName}
            avatarUrl={avatarUrl}
            climbs={climbs}
            boulderSystem={boulderSystem}
            ropeSystem={ropeSystem}
            onNavigateToStats={() => setCurrentScreen(Screen.Stats)}
            onNavigateToLeaderboard={() => setCurrentScreen(Screen.Leaderboard)}
          />
        );
      case Screen.History:
        return <History climbs={displayClimbs} boulderSystem={boulderSystem} ropeSystem={ropeSystem} />;
      case Screen.Log:
        return (
          <LogClimb
            defaultGym={homeGym}
            savedGyms={savedGyms}
            boulderSystem={boulderSystem}
            ropeSystem={ropeSystem}
            onAddClimb={handleAddClimb}
            onToggleSavedGym={toggleSavedGym}
            onCancel={() => setCurrentScreen(Screen.Home)}
          />
        );
      case Screen.Stats:
        return <Analytics climbs={displayClimbs} boulderSystem={boulderSystem} ropeSystem={ropeSystem} />;
      case Screen.Profile:
        return (
          <Profile
            isLoggedIn={isLoggedIn}
            onLogin={(mode) => handleLoginClick(mode || 'sign-in')}
            onLogout={handleLogout}
            userName={userName}
            setUserName={setUserName}
            gender={gender}
            setGender={setGender}
            birthday={birthday}
            setBirthday={setBirthday}
            avatarUrl={avatarUrl}
            onUpdateAvatar={(url) => updateProfile({ avatar_url: url })}
            homeGym={homeGym}
            savedGyms={savedGyms}
            boulderSystem={boulderSystem}
            ropeSystem={ropeSystem}
            onUpdateBoulderSystem={(sys) => updateProfile({ boulder_system: sys })}
            onUpdateRopeSystem={(sys) => updateProfile({ rope_system: sys })}
            onUpdateHomeGym={(name) => updateProfile({ home_gym: name })}
            onToggleSavedGym={toggleSavedGym}
            onSaveDetails={() => updateProfile({
              display_name: userName,
              gender: gender,
              birthday: birthday
            })}
            onBack={() => setCurrentScreen(Screen.Home)}
          />
        );
      case Screen.Leaderboard:
        return <Leaderboard onBack={() => setCurrentScreen(Screen.Home)} />;
      default:
        return <Dashboard userName={userName} avatarUrl={avatarUrl} climbs={climbs} boulderSystem={boulderSystem} ropeSystem={ropeSystem} onNavigateToStats={() => setCurrentScreen(Screen.Stats)} />;
    }
  };

  if (currentScreen === Screen.Splash) {
    return <SplashScreen />;
  }

  // Show navbar only if we are in expected app screens, not Auth or Onboarding
  const showNavbar = !showAuth && (!isLoggedIn || isProfileSetupComplete) && currentScreen !== Screen.Log;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background-dark text-white overflow-hidden relative shadow-2xl border-x border-white/5">
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
      {showNavbar && (
        <Navbar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
      )}
    </div>
  );
};

export default App;
