import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import './DocumentEditor.css';

interface Document {
  id: number;
  title: string;
  content: string;
  owner: {
    id: number;
    username: string;
  };
  versions: Array<{
    id: number;
    content: string;
    createdAt: string;
    updatedBy: {
      id: number;
      username: string;
    };
  }>;
}

const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = getSocket();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;

    fetchDocument();

    if (socket) {
      socket.emit('join-document', id);

      socket.on('document-update', handleDocumentUpdate);
      socket.on('active-users', handleActiveUsers);
      socket.on('user-joined', handleUserJoined);
      socket.on('user-left', handleUserLeft);
      socket.on('document-saved', handleDocumentSaved);
      socket.on('error', handleSocketError);

      return () => {
        socket.emit('leave-document', id);
        socket.off('document-update', handleDocumentUpdate);
        socket.off('active-users', handleActiveUsers);
        socket.off('user-joined', handleUserJoined);
        socket.off('user-left', handleUserLeft);
        socket.off('document-saved', handleDocumentSaved);
        socket.off('error', handleSocketError);
      };
    }
  }, [id, socket]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/documents/${id}`);
      setDocument(response.data);
      setContent(response.data.content);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching document:', error);
      alert(error.response?.data?.message || 'Failed to load document');
      navigate('/documents');
    }
  };

  const handleDocumentUpdate = (data: any) => {
    if (data.userId !== user?.id) {
      setContent(data.content);
    }
  };

  const handleActiveUsers = (users: string[]) => {
    setActiveUsers(users);
  };

  const handleUserJoined = (data: any) => {
    setActiveUsers((prev) => [...prev, data.userId]);
  };

  const handleUserLeft = (data: any) => {
    setActiveUsers((prev) => prev.filter((u) => u !== data.userId));
  };

  const handleDocumentSaved = (data: any) => {
    setLastSaved(new Date(data.timestamp));
    setSaving(false);
  };

  const handleSocketError = (error: any) => {
    console.error('Socket error:', error);
    alert(error.message);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (socket) {
      socket.emit('document-change', {
        documentId: id,
        content: newContent,
        cursorPosition: e.target.selectionStart,
      });
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 2000);
  };

  const handleSave = async (contentToSave?: string) => {
    if (!id) return;

    setSaving(true);
    const saveContent = contentToSave !== undefined ? contentToSave : content;

    try {
      await api.put(`/documents/${id}`, { content: saveContent });

      if (socket) {
        socket.emit('save-document', {
          documentId: id,
          content: saveContent,
        });
      }

      setLastSaved(new Date());

      // Refresh document to get updated versions
      const response = await api.get(`/documents/${id}`);
      setDocument(response.data);
    } catch (error: any) {
      console.error('Error saving document:', error);
      alert(error.response?.data?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertVersion = async (versionIndex: number) => {
    if (!id) return;

    if (!window.confirm('Are you sure you want to revert to this version?')) {
      return;
    }

    try {
      const response = await api.post(`/documents/${id}/revert/${versionIndex}`);
      setDocument(response.data);
      setContent(response.data.content);
      setShowVersions(false);
      setLastSaved(new Date());
      alert('Document reverted successfully!');
    } catch (error: any) {
      console.error('Error reverting version:', error);
      alert(error.response?.data?.message || 'Failed to revert version');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="header-left">
          <button onClick={() => navigate('/documents')} className="btn-back">
            ← Back
          </button>
          <h1>{document.title}</h1>
        </div>
        <div className="header-right">
          <div className="status-indicator">
            {saving ? (
              <span className="saving">Saving...</span>
            ) : lastSaved ? (
              <span className="saved">
                Saved at {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          <div className="active-users">
            <span className="users-count">
              {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
            </span>
          </div>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="btn-versions"
          >
            Version History
          </button>
        </div>
      </header>

      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing..."
          className="editor-textarea"
        />
      </div>

      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(false)}>
          <div className="modal-content versions-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Version History</h2>
            <div className="versions-list">
              {document.versions.length === 0 ? (
                <p className="no-versions">No versions yet</p>
              ) : (
                document.versions.map((version, index) => (
                  <div key={version.id} className="version-item">
                    <div className="version-info">
                      <strong>Version {index + 1}</strong>
                      <span className="version-date">
                        {formatDate(version.createdAt)}
                      </span>
                      <span className="version-author">
                        by {version.updatedBy?.username || 'Unknown'}
                      </span>
                    </div>
                    <div className="version-preview">
                      {version.content.substring(0, 100)}
                      {version.content.length > 100 ? '...' : ''}
                    </div>
                    <button
                      onClick={() => handleRevertVersion(index)}
                      className="btn-revert"
                    >
                      Revert to this version
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowVersions(false)}
              className="btn-close-modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
