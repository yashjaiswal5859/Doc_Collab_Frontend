import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './DocumentsList.css';

interface Document {
  id: number;
  title: string;
  owner: {
    id: number;
    username: string;
  };
  updatedAt: string;
  content: string;
}

const DocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await api.post('/documents', {
        title: newDocTitle,
        content: '',
      });
      setDocuments([response.data, ...documents]);
      setShowCreateModal(false);
      setNewDocTitle('');
      navigate(`/editor/${response.data.id}`);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/documents/${id}`);
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <header className="documents-header">
        <div className="header-content">
          <h1>CollabDocs</h1>
          <div className="header-actions">
            <span className="user-name">Hello, {user?.username}!</span>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="documents-main">
        <div className="documents-toolbar">
          <h2>My Documents</h2>
          <button onClick={() => setShowCreateModal(true)} className="btn-create">
            + New Document
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="empty-state">
            <h3>No documents yet</h3>
            <p>Create your first document to get started!</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-create">
              Create Document
            </button>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div
                  className="document-content"
                  onClick={() => navigate(`/editor/${doc.id}`)}
                >
                  <h3>{doc.title}</h3>
                  <p className="document-preview">
                    {doc.content
                      ? doc.content.substring(0, 100) + '...'
                      : 'Empty document'}
                  </p>
                  <div className="document-meta">
                    <span className="document-owner">by {doc.owner.username}</span>
                    <span className="document-date">{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
                {doc.owner.id === user?.id && (
                  <button
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Document</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateDocument}>
              <div className="form-group">
                <label htmlFor="title">Document Title</label>
                <input
                  type="text"
                  id="title"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Enter document title"
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-cancel"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;
