import React, { useState, useEffect, useRef } from 'react';
import { FileText, Eye } from 'lucide-react';
import Navbar from './components/Navbar';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import AtsModal from './components/AtsModal';
import WritingAssistantModal from './components/WritingAssistantModal';
import ImportExportModal from './components/ImportExportModal';
import SavedResumesModal from './components/SavedResumesModal';
import TemplateGalleryModal from './components/TemplateGalleryModal';
import CoverLetterModal from './components/CoverLetterModal';
import CreateResumeModal from './components/CreateResumeModal';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import TipModal from './components/TipModal';
import ImageCropModal from './components/ImageCropModal';
import Toast from './components/Toast';
import PullToRefresh from './components/PullToRefresh';
import { initialCvData, initialSampleResumes, starterBestPracticeData, templateOptions } from './data/defaultData';
import {
  supabase,
  isSupabaseConfigured,
  formatSupabaseUser,
  fetchCloudResumes,
  saveCloudResume,
  deleteCloudResume,
  signOutUser
} from './lib/supabase';

const RESUMES_STORAGE_KEY = 'cv_craft_saved_resumes_v4';
const ACTIVE_RESUME_KEY = 'cv_craft_active_resume_id_v4';
const LEGACY_STORAGE_KEY = 'cv_craft_pro_data_v3';
const AUTH_USER_STORAGE_KEY = 'cv_craft_auth_user_v1';
const CURRENT_VIEW_STORAGE_KEY = 'cv_craft_current_view_v1';

export default function App() {
  // Initialize resumes array with migration from legacy format
  const [resumes, setResumes] = useState(() => {
    try {
      // Check v4 storage first, fallback to earlier
      const savedResumes = localStorage.getItem(RESUMES_STORAGE_KEY) || localStorage.getItem('cv_craft_saved_resumes_v3') || localStorage.getItem('cv_craft_saved_resumes_v2');
      if (savedResumes) {
        const parsed = JSON.parse(savedResumes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((r) => {
            if (r.data?.personalInfo?.photoUrl === '/avatar-default.png') {
              r.data.personalInfo.photoUrl = '';
            }
          });
          return parsed;
        }
      }

      // Check legacy single-CV storage
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        const parsedLegacy = JSON.parse(legacyData);
        return [
          {
            id: `resume-${Date.now()}`,
            title: `${parsedLegacy.personalInfo?.fullName || 'My Resume'} (Primary)`,
            targetRole: parsedLegacy.personalInfo?.jobTitle || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: parsedLegacy
          },
          ...initialSampleResumes.slice(1)
        ];
      }
    } catch (e) {
      console.error('Failed to load saved resumes:', e);
    }
    return initialSampleResumes;
  });

  // Initialize active resume ID
  const [activeResumeId, setActiveResumeId] = useState(() => {
    try {
      const savedActiveId = localStorage.getItem(ACTIVE_RESUME_KEY);
      if (savedActiveId && resumes.some((r) => r.id === savedActiveId)) {
        return savedActiveId;
      }
    } catch (e) {
      console.error('Failed to load active resume ID:', e);
    }
    return resumes[0]?.id || 'resume-initial-1';
  });

  // Current active CV Data
  const currentResume = resumes.find((r) => r.id === activeResumeId) || resumes[0];
  const [cvData, setCvData] = useState(currentResume?.data || initialCvData);

  const [activeMobileView, setActiveMobileView] = useState('editor'); // 'editor' | 'preview'
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [isWritingAssistantOpen, setIsWritingAssistantOpen] = useState(false);
  const [writingAssistantTab, setWritingAssistantTab] = useState('star');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState('export');
  const [isResumesModalOpen, setIsResumesModalOpen] = useState(false);
  const [isCreateResumeOpen, setIsCreateResumeOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isCoverLetterOpen, setIsCoverLetterOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [documentType, setDocumentType] = useState('cv'); // 'cv' | 'cover-letter'
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [toast, setToast] = useState(null);

  // Authentication & View States
  const [authUser, setAuthUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Failed to load auth user:', e);
    }
    return null;
  });

  // Current view: 'landing' or 'editor' (remembers user position on reload)
  const [currentView, setCurrentView] = useState(() => {
    try {
      // 1. Explicit URL parameter ?view=landing or ?view=editor
      const searchParams = new URLSearchParams(window.location.search);
      const viewParam = searchParams.get('view');
      if (viewParam === 'landing' || viewParam === 'editor') {
        return viewParam;
      }

      // 2. Section hash on landing page (e.g. #overview, #templates, #features, #faq)
      const hash = window.location.hash;
      if (hash && ['#overview', '#templates', '#features', '#cover-letters', '#faq'].includes(hash)) {
        return 'landing';
      }

      // 3. Stored user view preference
      const savedView = localStorage.getItem(CURRENT_VIEW_STORAGE_KEY);
      if (savedView === 'landing' || savedView === 'editor') {
        return savedView;
      }
    } catch (e) {
      console.error('Failed to load current view:', e);
    }
    return 'landing';
  });

  // Persist view state so refreshing preserves the current screen
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_VIEW_STORAGE_KEY, currentView);
    } catch (e) {
      console.error('Failed to save current view:', e);
    }
  }, [currentView]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signup'); // 'signup' | 'signin'
  const [targetTemplateForAuth, setTargetTemplateForAuth] = useState(null);

  const previewPrintRef = useRef(null);
  const cloudSaveTimerRef = useRef(null);

  // Cloud resumes sync helper with intelligent timestamp-based merge
  const syncFromCloud = async (userId) => {
    if (!isSupabaseConfigured || !supabase || !userId) return;
    try {
      const cloudResumes = await fetchCloudResumes(userId);
      if (cloudResumes && cloudResumes.length > 0) {
        // Read the most up-to-date local resumes from localStorage
        let localResumes = [];
        try {
          const raw = localStorage.getItem(RESUMES_STORAGE_KEY);
          if (raw) localResumes = JSON.parse(raw);
        } catch (e) {
          console.error('Failed to parse local resumes for sync:', e);
        }
        if (!Array.isArray(localResumes) || localResumes.length === 0) {
          localResumes = resumes;
        }

        const mergedMap = new Map();
        cloudResumes.forEach((cr) => mergedMap.set(cr.id, cr));

        const resumesToUpload = [];
        localResumes.forEach((lr) => {
          const cloudVer = mergedMap.get(lr.id);
          if (!cloudVer) {
            mergedMap.set(lr.id, lr);
            resumesToUpload.push(lr);
          } else {
            const localTime = lr.updatedAt || 0;
            const cloudTime = cloudVer.updatedAt || 0;
            if (localTime > cloudTime) {
              // Local changes are NEWER than cloud: Keep local and upload to cloud
              mergedMap.set(lr.id, lr);
              resumesToUpload.push(lr);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        setResumes(mergedList);
        localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(mergedList));

        const currentActiveId = localStorage.getItem(ACTIVE_RESUME_KEY) || activeResumeId;
        const activeRes = mergedList.find((r) => r.id === currentActiveId) || mergedList[0];
        if (activeRes) {
          setActiveResumeId(activeRes.id);
          localStorage.setItem(ACTIVE_RESUME_KEY, activeRes.id);
          if (activeRes.data) {
            setCvData(activeRes.data);
            localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(activeRes.data));
          }
        }

        // Upload any local versions that were newer
        if (resumesToUpload.length > 0) {
          for (const resToUpload of resumesToUpload) {
            await saveCloudResume(userId, resToUpload);
          }
        }
      } else {
        // First cloud sync: User has existing local resume, upload to cloud
        const currentActive = resumes.find((r) => r.id === activeResumeId) || resumes[0];
        if (currentActive) {
          await saveCloudResume(userId, currentActive);
        }
      }
    } catch (err) {
      console.error('Failed to sync cloud resumes:', err);
    }
  };

  // Supabase Auth listener & cloud resumes sync
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check active session on load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        const user = formatSupabaseUser(session.user);
        setAuthUser(user);
        try {
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        } catch (e) {
          console.error('Failed to save auth user:', e);
        }
        syncFromCloud(user.id);
      }
    });

    // Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const user = formatSupabaseUser(session.user);
        setAuthUser(user);
        try {
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        } catch (e) {
          console.error('Failed to save auth user:', e);
        }
        syncFromCloud(user.id);
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        try {
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        } catch (e) {
          console.error('Failed to clear auth user:', e);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, []);

  // Sync cvData when active resume changes
  useEffect(() => {
    const found = resumes.find((r) => r.id === activeResumeId);
    if (found && found.data) {
      setCvData(found.data);
    }
  }, [activeResumeId]);

  // Auto-save active cvData to resumes list and localStorage
  useEffect(() => {
    try {
      setSaveStatus('saving');
      const now = Date.now();
      const updatedResumes = resumes.map((r) => {
        if (r.id === activeResumeId) {
          return {
            ...r,
            targetRole: cvData.personalInfo?.jobTitle || r.targetRole,
            updatedAt: now,
            data: cvData
          };
        }
        return r;
      });

      localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(updatedResumes));
      localStorage.setItem(ACTIVE_RESUME_KEY, activeResumeId);
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cvData));

      // Sync active resume to Supabase cloud if user is logged in (debounced)
      if (authUser && isSupabaseConfigured) {
        const activeResumeToSave = updatedResumes.find((r) => r.id === activeResumeId);
        if (activeResumeToSave) {
          if (cloudSaveTimerRef.current) {
            clearTimeout(cloudSaveTimerRef.current);
          }
          cloudSaveTimerRef.current = setTimeout(() => {
            saveCloudResume(authUser.id, activeResumeToSave);
          }, 600);
        }
      }

      // Update state without triggering infinite loop
      setResumes(updatedResumes);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save CV data:', e);
    }
  }, [cvData]);

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Calculate ATS Score dynamically
  const calculateAtsScore = () => {
    let score = 0;
    const { personalInfo, professionalSummary, workExperience, education, skills } = cvData;

    // Contact (max 25)
    if (personalInfo.fullName) score += 5;
    if (personalInfo.jobTitle) score += 5;
    if (personalInfo.email) score += 5;
    if (personalInfo.phone) score += 5;
    if (personalInfo.location) score += 5;

    // Summary (max 20)
    if (professionalSummary) {
      const words = professionalSummary.trim().split(/\s+/).length;
      if (words >= 30 && words <= 120) score += 20;
      else if (words > 10) score += 12;
    }

    // Work Experience (max 30)
    if (workExperience && workExperience.length > 0) {
      score += 10;
      const hasBullets = workExperience.some((e) => e.highlights && e.highlights.length >= 2);
      if (hasBullets) score += 10;
      const hasMetrics = workExperience.some((e) =>
        e.highlights?.some((h) => /\d+|%|CI\/CD|IaC|Kubernetes|GitLab/i.test(h))
      );
      if (hasMetrics) score += 10;
    }

    // Education (max 10)
    if (education && education.length > 0 && education[0].degree) {
      score += 10;
    }

    // Skills (max 15)
    if (skills && skills.length >= 4) {
      score += 15;
    } else if (skills && skills.length > 0) {
      score += 8;
    }

    return Math.min(100, Math.max(20, score));
  };

  const atsScore = calculateAtsScore();

  // Resume Management Operations
  const handleSelectResume = (id) => {
    const target = resumes.find((r) => r.id === id);
    if (target) {
      setActiveResumeId(id);
      setCvData(target.data);
      localStorage.setItem(ACTIVE_RESUME_KEY, id);
      showToast(`Switched to "${target.title}"`, 'info');
    }
  };

  const handleCreateResume = (title, presetData) => {
    const newId = `resume-${Date.now()}`;
    const newResume = {
      id: newId,
      title: title || 'Untitled Resume',
      targetRole: presetData.personalInfo?.jobTitle || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: presetData
    };

    const nextResumes = [newResume, ...resumes];
    setResumes(nextResumes);
    setActiveResumeId(newId);
    setCvData(presetData);
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(nextResumes));
    localStorage.setItem(ACTIVE_RESUME_KEY, newId);
  };

  const handleDuplicateResume = (id) => {
    const source = resumes.find((r) => r.id === id);
    if (!source) return;

    const newId = `resume-${Date.now()}`;
    const duplicate = {
      ...source,
      id: newId,
      title: `${source.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: JSON.parse(JSON.stringify(source.data))
    };

    const nextResumes = [duplicate, ...resumes];
    setResumes(nextResumes);
    setActiveResumeId(newId);
    setCvData(duplicate.data);
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(nextResumes));
    localStorage.setItem(ACTIVE_RESUME_KEY, newId);
    showToast(`Duplicated as "${duplicate.title}"`, 'success');
  };

  const handleRenameResume = (id, newTitle) => {
    const nextResumes = resumes.map((r) =>
      r.id === id ? { ...r, title: newTitle, updatedAt: Date.now() } : r
    );
    setResumes(nextResumes);
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(nextResumes));
  };

  const handleDeleteResume = (id) => {
    if (resumes.length <= 1) {
      showToast('Cannot delete your only resume', 'warning');
      return;
    }

    const nextResumes = resumes.filter((r) => r.id !== id);
    setResumes(nextResumes);
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(nextResumes));

    if (authUser && isSupabaseConfigured) {
      deleteCloudResume(authUser.id, id);
    }

    if (activeResumeId === id) {
      const nextActive = nextResumes[0];
      setActiveResumeId(nextActive.id);
      setCvData(nextActive.data);
      localStorage.setItem(ACTIVE_RESUME_KEY, nextActive.id);
    }
    showToast('Resume deleted', 'info');
  };

  const handleImportResume = (importedJson) => {
    let importedData = importedJson;
    let title = 'Imported Resume';

    // Support both single-resume JSON and full backup format
    if (importedJson.data && importedJson.title) {
      title = importedJson.title;
      importedData = importedJson.data;
    } else if (importedJson.personalInfo) {
      title = `${importedJson.personalInfo.fullName || 'Candidate'} - Imported`;
      importedData = importedJson;
    }

    const newId = `resume-${Date.now()}`;
    const newResume = {
      id: newId,
      title,
      targetRole: importedData.personalInfo?.jobTitle || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: importedData
    };

    const nextResumes = [newResume, ...resumes];
    setResumes(nextResumes);
    setActiveResumeId(newId);
    setCvData(importedData);
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(nextResumes));
    localStorage.setItem(ACTIVE_RESUME_KEY, newId);
  };

  const handleExportAllResumes = () => {
    const backupData = {
      version: 'cv-craft-backup-v2',
      exportedAt: new Date().toISOString(),
      resumes
    };
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `cv_craft_all_resumes_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported all saved resumes backup!', 'success');
  };

  // Reset to reference example
  const handleResetToExample = () => {
    if (window.confirm('Reset this resume to sample reference data? Any unsaved edits will be replaced.')) {
      setCvData(initialCvData);
      showToast('Loaded reference CV example', 'success');
    }
  };

  // Clear data
  const handleClearData = () => {
    if (window.confirm('Clear all fields in this resume to start fresh?')) {
      setCvData({
        ...initialCvData,
        personalInfo: {
          fullName: '',
          jobTitle: '',
          email: '',
          phone: '',
          location: '',
          website: '',
          linkedin: '',
          github: '',
          photoUrl: ''
        },
        professionalSummary: '',
        workExperience: [],
        education: [],
        skills: [],
        languages: [],
        hobbies: '',
        customSections: []
      });
      showToast('CV form cleared', 'info');
    }
  };

  // Vector Print / Save PDF
  const handlePrintPdf = () => {
    document.body.classList.add('printing-cv-only');
    showToast('Print dialog opened! Tip: Check "Background graphics" (Fona grafika) to include all colors & designs.', 'info');
    // Allow paint/style updates to settle before pausing thread with print dialog
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.print();
        } finally {
          setTimeout(() => {
            document.body.classList.remove('printing-cv-only');
            // Show gratitude tip modal after user finishes or closes the print dialog
            setTimeout(() => {
              setIsTipModalOpen(true);
            }, 600);
          }, 800);
        }
      }, 60);
    });
  };

  // Direct File Download as PDF using html2pdf.js
  const handleDownloadDirectPdf = async () => {
    let container = null;
    try {
      setIsDownloading(true);
      showToast('Preparing PDF download...', 'info');

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById('cv-printable-document');
      if (!element) {
        throw new Error('CV element not found');
      }

      const isMultiPage = element.scrollHeight > 1135;
      const docLabel = documentType === 'cover-letter' ? 'Cover_Letter' : 'Resume';

      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.zIndex = '99999';
      container.style.width = '210mm';
      container.style.backgroundColor = '#ffffff';

      const clone = element.cloneNode(true);
      clone.style.width = '210mm';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.transform = 'none';

      container.appendChild(clone);
      document.body.appendChild(container);

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `${(cvData.personalInfo?.fullName || 'CV').replace(/\s+/g, '_')}_${docLabel}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf()
        .set(opt)
        .from(clone)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          if (!isMultiPage) {
            const totalPages = pdf.internal.getNumberOfPages();
            if (totalPages > 1) {
              for (let i = totalPages; i > 1; i--) {
                pdf.deletePage(i);
              }
            }
          }
        })
        .save();

      showToast(`${docLabel} PDF downloaded successfully!`, 'success');

      // Show gratitude tip modal after successful direct PDF download
      setTimeout(() => {
        setIsTipModalOpen(true);
      }, 850);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Direct download encountered an issue. Try "Print / Save PDF"', 'warning');
      window.print();
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsDownloading(false);
    }
  };

  // Add skill dynamically (e.g. from Job Matcher)
  const handleAddSkill = (skillName) => {
    setCvData((prev) => {
      const existing = (prev.skills || []).some(
        (s) => (typeof s === 'string' ? s.toLowerCase() : s.name?.toLowerCase()) === skillName.toLowerCase()
      );
      if (existing) return prev;
      return {
        ...prev,
        skills: [...(prev.skills || []), { id: `sk-${Date.now()}-${Math.random()}`, name: skillName, level: 'Advanced' }]
      };
    });
  };

  // Insert content suggestions
  const handleInsertSummary = (text) => {
    setCvData((prev) => ({
      ...prev,
      professionalSummary: text
    }));
    showToast('Summary suggestion applied to your CV!', 'success');
  };

  const handleInsertBullet = (bulletText) => {
    setCvData((prev) => {
      if (!prev.workExperience || prev.workExperience.length === 0) {
        return {
          ...prev,
          workExperience: [
            {
              id: `exp-${Date.now()}`,
              jobTitle: 'Position Title',
              company: 'Company Name',
              location: '',
              startDate: '',
              endDate: '',
              current: true,
              highlights: [bulletText]
            }
          ]
        };
      }
      const firstExp = { ...prev.workExperience[0] };
      firstExp.highlights = [...(firstExp.highlights || []), bulletText];
      return {
        ...prev,
        workExperience: [firstExp, ...prev.workExperience.slice(1)]
      };
    });
    showToast('Bullet point inserted into experience!', 'success');
  };

  const handleTemplateSelect = (templateId) => {
    setCvData((prev) => ({
      ...prev,
      designConfig: {
        ...prev.designConfig,
        templateId
      }
    }));
  };

  const handleOpenCropModal = (imageSrc) => {
    const src = imageSrc || cvData.personalInfo?.originalPhotoUrl || cvData.personalInfo?.photoUrl;
    if (!src) return;
    setCropImageSrc(src);
    setIsCropModalOpen(true);
  };

  const handleApplyCrop = (croppedDataUrl) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        photoUrl: croppedDataUrl,
        originalPhotoUrl: cropImageSrc || croppedDataUrl
      }
    }));
    showToast('Profile photo cropped and saved!', 'success');
  };

  const handleAuthSuccess = (user) => {
    try {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(CURRENT_VIEW_STORAGE_KEY, 'editor');
    } catch (e) {
      console.error('Failed to save auth user:', e);
    }
    setAuthUser(user);
    setCurrentView('editor');
    setIsAuthModalOpen(false);
    if (user?.id) {
      syncFromCloud(user.id);
    }

    if (targetTemplateForAuth) {
      handleTemplateSelect(targetTemplateForAuth.id);
      showToast(`Welcome, ${user.name}! Applied template "${targetTemplateForAuth.name}".`, 'success');
      setTargetTemplateForAuth(null);
    } else {
      showToast(`Welcome, ${user.name}! Ready to craft your resume.`, 'success');
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.setItem(CURRENT_VIEW_STORAGE_KEY, 'landing');
      await signOutUser();
    } catch (e) {
      console.error('Failed to clear auth user:', e);
    }
    setAuthUser(null);
    setCurrentView('landing');
    showToast('Signed out successfully. See you soon!', 'info');
  };

  const handleOpenAuth = (mode = 'signup', targetTemplateName = null, templateId = null) => {
    setAuthModalMode(mode);
    setTargetTemplateForAuth(templateId ? { id: templateId, name: targetTemplateName } : null);
    setIsAuthModalOpen(true);
  };

  const handlePullRefresh = () => {
    try {
      if (activeResumeId && cvData) {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cvData));
        const savedResumes = localStorage.getItem(RESUMES_STORAGE_KEY);
        if (savedResumes) {
          const list = JSON.parse(savedResumes);
          const updated = list.map((r) =>
            r.id === activeResumeId ? { ...r, data: cvData, updatedAt: new Date().toISOString() } : r
          );
          localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn('Sync before reload error:', e);
    }
    setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  // If visitor or on landing page, display the Landing Page
  if (!authUser || currentView === 'landing') {
    return (
      <PullToRefresh onRefresh={handlePullRefresh}>
        <div className="landing-wrapper">
          <LandingPage
            authUser={authUser}
            onOpenAuth={handleOpenAuth}
            onEnterWorkspace={() => {
              if (authUser) {
                setCurrentView('editor');
              } else {
                handleOpenAuth('signin');
              }
            }}
            onSelectTemplateAndStart={(templateId) => {
              if (authUser) {
                handleTemplateSelect(templateId);
                setCurrentView('editor');
              } else {
                const tmpl = templateOptions.find((t) => t.id === templateId);
                handleOpenAuth('signup', tmpl?.name || templateId, templateId);
              }
            }}
            onShowToast={showToast}
            onOpenTipModal={() => setIsTipModalOpen(true)}
          />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            onAuthSuccess={handleAuthSuccess}
            targetTemplateName={targetTemplateForAuth?.name}
          />

          <TipModal
            isOpen={isTipModalOpen}
            onClose={() => setIsTipModalOpen(false)}
            onShowToast={showToast}
          />

          <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <div className="app-root">
      {/* Top Navigation & Toolbar */}
      <Navbar
        cvData={cvData}
        onChange={setCvData}
        resumes={resumes}
        activeResumeId={activeResumeId}
        onSelectResume={handleSelectResume}
        onOpenResumesModal={() => setIsResumesModalOpen(true)}
        onOpenCreateResume={() => setIsCreateResumeOpen(true)}
        onOpenGallery={() => setIsGalleryModalOpen(true)}
        onOpenWritingAssistant={(tab) => {
          setWritingAssistantTab(tab || 'star');
          setIsWritingAssistantOpen(true);
        }}
        onOpenImportExport={(tab) => {
          setImportExportTab(tab || 'export');
          setIsImportExportOpen(true);
        }}
        onOpenJobMatcher={() => {
          setWritingAssistantTab('job');
          setIsWritingAssistantOpen(true);
        }}
        documentType={documentType}
        onChangeDocumentType={setDocumentType}
        onOpenCoverLetter={() => {
          const next = documentType === 'cover-letter' ? 'cv' : 'cover-letter';
          setDocumentType(next);
          showToast(
            next === 'cover-letter'
              ? 'Switched to Cover Letter editor & live preview!'
              : 'Switched to Resume (CV) editor & preview',
            'info'
          );
        }}
        onOpenQuickTextParser={() => {
          setImportExportTab('import');
          setIsImportExportOpen(true);
        }}
        saveStatus={saveStatus}
        onResetToExample={handleResetToExample}
        onClearData={handleClearData}
        onDownloadDirectPdf={handleDownloadDirectPdf}
        onPrintPdf={handlePrintPdf}
        onOpenSuggestions={() => {
          setWritingAssistantTab('suggestions');
          setIsWritingAssistantOpen(true);
        }}
        onOpenAtsModal={() => setIsAtsModalOpen(true)}
        onOpenTipModal={() => setIsTipModalOpen(true)}
        atsScore={atsScore}
        isDownloading={isDownloading}
        activeMobileView={activeMobileView}
        setActiveMobileView={setActiveMobileView}
        onShowToast={showToast}
        authUser={authUser}
        onSignOut={handleSignOut}
        onOpenLanding={() => setCurrentView('landing')}
      />

      {/* Main Workspace (Split Screen) */}
      <main className="app-workspace">
        {/* Left Side: Editor Form */}
        <section
          className={`workspace-panel editor-panel ${
            activeMobileView === 'editor' ? 'editor-active-mobile' : 'editor-inactive-mobile'
          }`}
        >
          <EditorPanel
            cvData={cvData}
            onChange={setCvData}
            documentType={documentType}
            onChangeDocumentType={setDocumentType}
            onOpenWritingAssistant={(tab) => {
              setWritingAssistantTab(tab || 'star');
              setIsWritingAssistantOpen(true);
            }}
            onOpenSuggestions={() => {
              setWritingAssistantTab('suggestions');
              setIsWritingAssistantOpen(true);
            }}
            onOpenAtsModal={() => setIsAtsModalOpen(true)}
            onOpenGallery={() => setIsGalleryModalOpen(true)}
            onOpenJobMatcher={() => {
              setWritingAssistantTab('job');
              setIsWritingAssistantOpen(true);
            }}
            onOpenStarEnhancer={() => {
              setWritingAssistantTab('star');
              setIsWritingAssistantOpen(true);
            }}
            atsScore={atsScore}
            authUser={authUser}
            onShowToast={showToast}
            onOpenCropModal={handleOpenCropModal}
          />
        </section>

        {/* Right Side: A4 Live Document Preview */}
        <section
          className={`workspace-panel preview-panel ${
            activeMobileView === 'preview' ? 'preview-active-mobile' : 'preview-inactive-mobile'
          }`}
        >
          <PreviewPanel
            cvData={cvData}
            previewRef={previewPrintRef}
            onChangeTemplate={handleTemplateSelect}
            onOpenGallery={() => setIsGalleryModalOpen(true)}
            documentType={documentType}
            onChangeDocumentType={setDocumentType}
            onOpenCropModal={handleOpenCropModal}
          />
        </section>
      </main>

      {/* Floating Mobile Dock (Editor vs Preview) */}
      <div className="mobile-view-toggle" role="tablist" aria-label="Editor or Preview View">
        <button
          type="button"
          role="tab"
          aria-selected={activeMobileView === 'editor'}
          className={`toggle-tab ${activeMobileView === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveMobileView('editor')}
        >
          <FileText size={14} />
          <span>Editor</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMobileView === 'preview'}
          className={`toggle-tab ${activeMobileView === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveMobileView('preview')}
        >
          <Eye size={14} />
          <span>Preview</span>
        </button>
      </div>

      {/* Modals & Overlays */}
      <SavedResumesModal
        isOpen={isResumesModalOpen}
        onClose={() => setIsResumesModalOpen(false)}
        resumes={resumes}
        activeResumeId={activeResumeId}
        onSelectResume={handleSelectResume}
        onCreateResume={handleCreateResume}
        onDuplicateResume={handleDuplicateResume}
        onRenameResume={handleRenameResume}
        onDeleteResume={handleDeleteResume}
        onImportResume={handleImportResume}
        onExportAllResumes={handleExportAllResumes}
        onOpenCreateResume={() => setIsCreateResumeOpen(true)}
        onShowToast={showToast}
      />

      <CreateResumeModal
        isOpen={isCreateResumeOpen}
        onClose={() => setIsCreateResumeOpen(false)}
        onCreateResume={handleCreateResume}
        onShowToast={showToast}
      />

      <TemplateGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        currentTemplateId={cvData.designConfig?.templateId || 'signature-teal'}
        onSelectTemplate={handleTemplateSelect}
        onShowToast={showToast}
      />

      <AtsModal
        isOpen={isAtsModalOpen}
        onClose={() => setIsAtsModalOpen(false)}
        cvData={cvData}
        atsScore={atsScore}
      />

      <WritingAssistantModal
        isOpen={isWritingAssistantOpen}
        onClose={() => setIsWritingAssistantOpen(false)}
        initialTab={writingAssistantTab}
        cvData={cvData}
        onInsertBullet={handleInsertBullet}
        onInsertSummary={handleInsertSummary}
        onAddSkill={handleAddSkill}
        onShowToast={showToast}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        initialTab={importExportTab}
        cvData={cvData}
        onChange={setCvData}
        onPrintPdf={handlePrintPdf}
        onDownloadDirectPdf={handleDownloadDirectPdf}
        onShowToast={showToast}
        onCreateNewWithParsed={(title, parsed) => {
          handleCreateResume(title, parsed);
        }}
      />

      <CoverLetterModal
        isOpen={isCoverLetterOpen}
        onClose={() => setIsCoverLetterOpen(false)}
        cvData={cvData}
        onChangeCvData={setCvData}
        onShowToast={showToast}
        onPrintPdf={() => {
          setDocumentType('cover-letter');
          setTimeout(() => handlePrintPdf(), 50);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
        targetTemplateName={targetTemplateForAuth?.name}
      />

      {/* Tip / Buy Me a Coffee Modal */}
      <TipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Profile Photo Crop & Grid Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  </PullToRefresh>
  );
}
