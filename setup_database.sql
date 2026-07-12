-- ============================================================
-- Jira Clone - Database Setup Script
-- Run this in SQL Server Management Studio (SSMS)
-- Uses Windows Authentication
-- ============================================================

-- Create the database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'jira_clone')
BEGIN
    CREATE DATABASE jira_clone;
END
GO

USE jira_clone;
GO

PRINT 'Database jira_clone ready.';
PRINT 'Tables will be auto-created by SQLAlchemy when the backend starts.';
PRINT '';
PRINT 'To start the backend:';
PRINT '  cd backend';
PRINT '  pip install -r requirements.txt';
PRINT '  uvicorn app.main:app --reload';
PRINT '';
PRINT 'To start the frontend:';
PRINT '  cd frontend';
PRINT '  npm install';
PRINT '  npm run dev';
GO
