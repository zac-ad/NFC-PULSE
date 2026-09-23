    setIsActive(next); // optimistic
    const result = await apiCall('/api/profile', 'PATCH', {
      profileId: currentProfileId,
      is_active: next,
    });
    if (result.error) {
      setIsActive(!next); // revert
      setMessage({ type: 'error', text: `Failed: ${result.error}` });
    } else {
      setMessage({ type: 'success', text: `Profile is now ${next ? 'public' : 'private'}.` });
      setProfiles(prev => prev.map(p =>
        p.id === currentProfileId ? { ...p, is_active: next } : p
      ));
    }
  };

  const handleSignOut = async () => {
    await supabaseAuth.auth.signOut();
    setUserAccount(null);
    setCurrentProfileId(null);
    setProfiles([]);
  };

  // ── File upload — authenticated server route ─────────────────
  const handleFileUpload = async (file: File, type: 'avatar' | 'banner' | 'qr') => {
    if (!currentProfileId) return;
    if (type === 'avatar') setUploadingAvatar(true);
    if (type === 'banner') setUploadingBanner(true);
    if (type === 'qr') setUploadingQr(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const form = new FormData();
      form.append('profileId', currentProfileId);
      form.append('type', type);
      form.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');

      if (type === 'avatar') setAvatarUrl(result.publicUrl);
      if (type === 'banner') setBannerUrl(result.publicUrl);
      if (type === 'qr') setQrImageUrl(result.publicUrl);
      setMessage({ type: 'success', text: 'File uploaded.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
      setUploadingBanner(false);
      setUploadingQr(false);
    }
  };

;