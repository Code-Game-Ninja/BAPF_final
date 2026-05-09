# Project Setup Guide

Welcome to the **BP & AF Insurance Broker** platform! This document provides an easy step-by-step guide to get the project running locally on your machine, including database setup and sample data seeding.

## Prerequisites

Before starting, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) project (Cloud or Local)

## Getting Started

We've provided an automated setup script that will handle dependency installation, environment file creation, and database migrations/seeding.

### 1. Quick Setup

Run the following command in the root of your project:

```bash
npm run setup
```

The script will:
1. Create a `.env.local` file from `.env.example` (if it doesn't already exist).
2. Prompt you for your Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`) if they are missing.
3. Run `npm install` to install all necessary packages.
4. Run the database migration and seed process (`npm run db:push`).
   *(Note: You will be prompted to enter your database password during this step).*

### 2. Manual Setup (Alternative)

If you prefer to do things manually:

1. **Copy the Environment File:**
   ```bash
   cp .env.example .env.local
   ```
2. **Fill in your Supabase Credentials:** Open `.env.local` and add your Supabase URL and Keys.
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Run Migrations and Seed Data:**
   ```bash
   npm run db:push
   ```

## Included Sample Data (Seed)

The seed script perfectly aligns with the CRM schemas and populates the database with realistic sample data to help you test the platform immediately. 

It creates:
- **3 User Roles:** Admin, Manager, and Employee.
- **System Data:** 1 Branch, 14 Commission Rules (Health, Motor, Life, Fire, etc.), and 10 Holidays.
- **CRM Data:** 5 Customers, 5 Policies (Active, Expired, and Due), Premiums, Renewals, and Sales Leads.
- **Workflow Data:** Standard Operating Procedures (SOPs), Attendance logs, and Notifications.

### Default Login Credentials

After setup is complete, you can start the application and log in using any of the following accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@bpaf.com` | `Admin@123456` |
| **Manager** | `manager@bpaf.com` | `Manager@123456` |
| **Employee**| `employee@bpaf.com` | `Employee@123456` |

## Running the Application

Once setup is complete, start the development server:

```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## Troubleshooting

- **Database Password Issue:** Ensure you enter the Postgres database password correctly when `npm run db:push` asks for it. If you're using Supabase Cloud, this is the password you created when starting the project.
- **Module Not Found:** If you see module errors, manually run `npm install` again.
- **Connection Errors:** Verify that your `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct in the `.env.local` file.
