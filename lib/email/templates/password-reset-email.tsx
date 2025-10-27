import * as React from 'react';

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  resetToken: string;
}

export function PasswordResetEmail({ userName, resetUrl, resetToken }: PasswordResetEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
        color: '#333',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          EPOP Platform
        </h1>
        <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
          Enterprise Platform for Operational Performance
        </p>
      </div>

      {/* Body */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <h2 style={{ color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>
          Reset Your Password
        </h2>

        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
          Hi {userName},
        </p>

        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
          We received a request to reset your password for your EPOP Platform account.
          Click the button below to create a new password:
        </p>

        {/* Reset Button */}
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a
            href={resetUrl}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 30px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            Reset Password
          </a>
        </div>

        {/* Security Info */}
        <div
          style={{
            backgroundColor: '#f3f4f6',
            padding: '20px',
            borderRadius: '6px',
            margin: '30px 0',
          }}
        >
          <h3 style={{ color: '#374151', fontSize: '18px', marginTop: 0, marginBottom: '10px' }}>
            🔐 Security Information
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6b7280' }}>
            <li>This link will expire in 1 hour for your security</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>Your password will remain unchanged if you don't click the link</li>
            <li>Reference token: {resetToken}</li>
          </ul>
        </div>

        {/* Alternative Link */}
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
          If the button above doesn't work, copy and paste this link into your browser:
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', wordBreak: 'break-all', margin: 0 }}>
          {resetUrl}
        </p>

        {/* Footer */}
        <div
          style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 10px 0' }}>
            This is an automated message from EPOP Platform.
          </p>
          <p style={{ margin: 0 }}>
            If you have questions, please contact our support team.
          </p>
        </div>
      </div>

      {/* Additional Security Footer */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#9ca3af' }}>
        <p style={{ margin: 0 }}>
          For your security, please verify that this email came from epop-platform.com
        </p>
      </div>
    </div>
  );
}