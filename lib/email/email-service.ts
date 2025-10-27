import { render } from '@react-email/render';
import { PasswordResetEmail } from './templates/password-reset-email';

// Email configuration
interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
  replyTo?: string;
}

// Email service interface
export interface EmailService {
  sendPasswordReset(email: string, resetToken: string, userName: string): Promise<void>;
}

// Development email service (logs to console)
export class DevEmailService implements EmailService {
  async sendPasswordReset(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    console.log('📧 Password Reset Email (Development Mode)');
    console.log('===========================================');
    console.log(`To: ${email}`);
    console.log(`User: ${userName}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log('===========================================');
  }
}

// SMTP email service (for production)
export class SMTPEmailService implements EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendPasswordReset(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    const emailHtml = await render(
      PasswordResetEmail({
        userName,
        resetUrl,
        resetToken: resetToken.substring(0, 8) + '...', // Show partial token for security
      })
    );

    // In a real implementation, you would use nodemailer or similar:
    /*
    import nodemailer from 'nodemailer';

    const transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    await transporter.sendMail({
      from: this.config.from,
      to: email,
      replyTo: this.config.replyTo,
      subject: 'Reset your EPOP Platform password',
      html: emailHtml,
    });
    */

    // For now, log the email content
    console.log('📧 Password Reset Email (SMTP Mode)');
    console.log('====================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your EPOP Platform password`);
    console.log(`HTML Length: ${emailHtml.length} characters`);
    console.log('====================================');
  }
}

// SendGrid email service (alternative)
export class SendGridEmailService implements EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendPasswordReset(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    const emailHtml = await render(
      PasswordResetEmail({
        userName,
        resetUrl,
        resetToken: resetToken.substring(0, 8) + '...',
      })
    );

    // In a real implementation, you would use @sendgrid/mail:
    /*
    import sgMail from '@sendgrid/mail';
    sgMail.setApiKey(this.apiKey);

    await sgMail.send({
      to: email,
      from: this.fromEmail,
      subject: 'Reset your EPOP Platform password',
      html: emailHtml,
    });
    */

    // For now, log the email content
    console.log('📧 Password Reset Email (SendGrid Mode)');
    console.log('=======================================');
    console.log(`To: ${email}`);
    console.log(`From: ${this.fromEmail}`);
    console.log(`Subject: Reset your EPOP Platform password`);
    console.log(`HTML Length: ${emailHtml.length} characters`);
    console.log('=======================================');
  }
}

// Factory function to create appropriate email service
export function createEmailService(): EmailService {
  const env = process.env.NODE_ENV;
  const emailProvider = process.env.EMAIL_PROVIDER || 'dev';

  if (env === 'development' || emailProvider === 'dev') {
    return new DevEmailService();
  }

  if (emailProvider === 'smtp') {
    return new SMTPEmailService({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.EMAIL_FROM || 'noreply@epop-platform.com',
      replyTo: process.env.EMAIL_REPLY_TO,
    });
  }

  if (emailProvider === 'sendgrid') {
    return new SendGridEmailService(
      process.env.SENDGRID_API_KEY || '',
      process.env.EMAIL_FROM || 'noreply@epop-platform.com'
    );
  }

  // Default to dev service
  return new DevEmailService();
}

// Export singleton instance
export const emailService = createEmailService();