// === IMPORTS ===
import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/ToastContext";
import "../../../styles/ComponentsStyles/modal.css";

// === STYLES ===
const spinnerKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject keyframes into document
if (typeof document !== 'undefined' && !document.querySelector('#spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spinner-keyframes';
  style.textContent = spinnerKeyframes;
  document.head.appendChild(style);
}

// === COMPONENT ===
export default function SocialMediaShareModal({ isOpen, onClose, event, onPublish }) {
  const { showToast } = useToast();
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    facebook: false,
    twitter: false,
  });
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatforms({ facebook: false, twitter: false });
      setIsPublishing(false);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const eventData = event._raw || event;

  const handleCheckboxChange = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  // Function to download event image
  const downloadEventImage = (imageData, eventTitle) => {
    try {
      if (!imageData) {
        console.warn("No image data to download");
        return false;
      }

      // Convert base64 to blob
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Create a safe filename from the event title
      const safeTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      link.download = `${safeTitle}_event_image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Failed to download image:", error);
      return false;
    }
  };

  const handleShare = async () => {
    // First, publish the event to the backend
    setIsPublishing(true);
    try {
      await onPublish(eventData.id);

      // Show success message
      showToast("Event published successfully! Opening social media...", "success");

      // Wait a moment to let the user see the success message
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setIsPublishing(false);
      showToast(err.response?.data?.message || "Failed to publish event. Please try again.", "error");
      return; // Don't proceed with social media sharing if publish failed
    }
    setIsPublishing(false);

    const { title, description, dateOfEvent, address, image } = eventData;

    // Download image if available
    let imageDownloaded = false;
    if (image) {
      imageDownloaded = downloadEventImage(image, title);
      if (imageDownloaded) {
        showToast("Event image downloaded to your Downloads folder! You can now drag it into your social media posts.", "success");
      } else {
        showToast("Failed to download image. You can right-click the image in event details to save it manually.", "warning");
      }
    }

    // Format the event date
    const formattedDate = new Date(dateOfEvent).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create location string with map link
    const locationString = address
      ? `${address.street}${address.building ? ' ' + address.building : ''}${address.premises ? ', ' + address.premises : ''}, ${address.city}, ${address.postalCode}`
      : 'Location TBD';

    const mapsUrl = address
      ? `https://maps.google.com/?q=${encodeURIComponent(locationString)}`
      : '';

    // Create post content for Facebook (full version)
    const facebookPostLines = [
      `${title}`,
      ``,
      `${description}`,
      ``,
      `📅 When: ${formattedDate}`,
      address ? `📍 Where: ${locationString}` : '',
      mapsUrl ? `🗺️ View on Google Maps: ${mapsUrl}` : '',
    ].filter(Boolean);

    const facebookPostText = facebookPostLines.join('\n');

    // Create post content for Twitter (condensed to fit character limit)
    const twitterPostLines = [
      `${title}`,
      ``,
      description.length > 100 ? `${description.substring(0, 100)}...` : description,
      ``,
      `📅 ${formattedDate}`,
      address ? `📍 ${locationString}` : '',
      mapsUrl ? `🗺️ ${mapsUrl}` : '',
    ].filter(Boolean);

    const twitterPostText = twitterPostLines.join('\n');

    // Handle Facebook sharing - try multiple approaches for best UX
    if (selectedPlatforms.facebook) {
      try {
        // Copy to clipboard as fallback
        await navigator.clipboard.writeText(facebookPostText);

        // Approach 1: Try Facebook's sharer.php with quote parameter (works in some browsers)
        // Note: Facebook has restricted pre-filling text to prevent spam, but we can try
        const encodedUrl = encodeURIComponent(mapsUrl || window.location.href);
        const encodedQuote = encodeURIComponent(facebookPostText);

        // Try multiple Facebook sharing URLs in order of preference
        const facebookShareUrls = [
          // Attempt 1: Desktop sharer with quote (may work in some browsers)
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedQuote}`,

          // Attempt 2: Mobile sharer (sometimes more permissive)
          `https://m.facebook.com/sharer.php?u=${encodedUrl}&quote=${encodedQuote}`,

          // Attempt 3: Basic sharer (will only show URL preview)
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        ];

        // Use the first approach - if quote doesn't work, user can paste from clipboard
        const facebookUrl = facebookShareUrls[0];

        showToast("Opening Facebook share dialog. If text is not pre-filled, it has been copied to your clipboard - paste (Ctrl+V or Cmd+V) into your post.", "success");

        // Open Facebook share dialog
        setTimeout(() => {
          window.open(facebookUrl, '_blank', 'width=600,height=600');
        }, 500);
      } catch (error) {
        console.error("Failed to prepare Facebook sharing:", error);
        showToast("Failed to copy event details. Please copy the text manually from the event details.", "error");
      }
    }

    // Handle Twitter/X sharing - this works with the intent/tweet endpoint
    if (selectedPlatforms.twitter) {
      setTimeout(() => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterPostText)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
      }, selectedPlatforms.facebook ? 600 : 100);
    }

    // Close modal after a delay to allow user to see confirmations
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  const isAnyPlatformSelected = Object.values(selectedPlatforms).some(v => v);

  return (
    <>
      <Modal
        onClose={onClose}
        title="Share Event on Social Media"
        wide={true}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={isPublishing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="btn-confirm"
              disabled={!isAnyPlatformSelected || isPublishing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center'
              }}
            >
              {isPublishing ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Publishing...
                </>
              ) : (
                'Publish & Share'
              )}
            </button>
          </div>
        }
      >
        <div style={{ padding: '1rem 0' }}>
          {/* Important notice banner */}
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--info-bg, #eff6ff)',
            border: '1px solid var(--info, #3b82f6)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--info-dark, #1e40af)'
          }}>
            <strong>Important:</strong> When you click "Publish & Share", the event will be published and its status will change to "Published". Social media share windows will then open automatically.
          </div>

          {/* Two-column layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40% 1fr',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {/* LEFT COLUMN: Social Media Options */}
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Select platforms:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Facebook */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: selectedPlatforms.facebook ? 'rgba(24, 119, 242, 0.05)' : 'transparent',
                    borderColor: selectedPlatforms.facebook ? '#1877F2' : 'var(--border-color, #e2e8f0)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.facebook}
                    onChange={() => handleCheckboxChange('facebook')}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#1877F2',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.5rem'
                    }}>
                      f
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '1rem' }}>Facebook</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Share dialog with URL
                      </div>
                    </div>
                  </div>
                </label>

                {/* Twitter/X */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: selectedPlatforms.twitter ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                    borderColor: selectedPlatforms.twitter ? '#000000' : 'var(--border-color, #e2e8f0)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.twitter}
                    onChange={() => handleCheckboxChange('twitter')}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#000000',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.5rem'
                    }}>
                      𝕏
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '1rem' }}>X (Twitter)</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Post to followers
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* RIGHT COLUMN: Info Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dynamic info box - changes based on state and selection */}
              <div style={{
                padding: '1rem',
                backgroundColor: isPublishing ? 'var(--info-bg, #eff6ff)' : 'var(--bg-secondary, #f8fafc)',
                border: isPublishing ? '1px solid var(--info, #3b82f6)' : '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: isPublishing ? 'var(--info-dark, #1e40af)' : 'var(--text-secondary)'
              }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {isPublishing ? 'Publishing...' : 'How it works:'}
                </strong>
                {isPublishing ? (
                  <p style={{ margin: 0, lineHeight: '1.5' }}>
                    Publishing event and preparing shares. Social media windows will open automatically when ready.
                  </p>
                ) : (
                  <>
                    {!selectedPlatforms.facebook && !selectedPlatforms.twitter ? (
                      <p style={{ margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                        Select a platform above to see sharing instructions.
                      </p>
                    ) : (
                      <ul style={{ margin: '0', paddingLeft: '1.25rem', lineHeight: '1.5' }}>
                        {selectedPlatforms.facebook && (
                          <li><strong>Facebook:</strong> Opens share dialog with event URL. Details copied to clipboard for pasting (Ctrl+V or Cmd+V).</li>
                        )}
                        {selectedPlatforms.twitter && (
                          <li><strong>X (Twitter):</strong> Details pre-filled automatically in post composer.</li>
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* Image auto-download notice - only show if not publishing and event has image */}
              {!isPublishing && eventData.image && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'var(--success-bg, #f0fdf4)',
                  border: '1px solid var(--success, #22c55e)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: 'var(--success-dark, #166534)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>✓</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Automatic Image Download:
                      </strong>
                      <p style={{ margin: '0 0 0.5rem 0', lineHeight: '1.5' }}>
                        Event image downloads automatically to your Downloads folder. Drag it into your post!
                      </p>
                      <ul style={{ margin: '0', paddingLeft: '1.25rem', lineHeight: '1.5' }}>
                        <li>Saved as: <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>[Event_Title]_event_image.jpg</code></li>
                        <li>Find it in your Downloads folder</li>
                        <li>Drag and drop into your social media post</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
