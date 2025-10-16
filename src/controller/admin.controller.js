require('dotenv').config();
const { OpenAI } = require('openai');
const UserModel = require('../models/User');
const ActivityLog = require('../models/ActivityLogSchema');
const Clause = require("../models/clauseSchema");
const Template = require("../models/Template");
 


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.generateText = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: prompt }],
    });

    res.status(200).json({ response: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ message: 'Error generating text', error: error.message });
  }
};


exports.getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const users = await UserModel.find()
      .skip(skip)
      .limit(limit)
      .select('-password');
    const total = await UserModel.countDocuments();
    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

// Get all users for admin management (no pagination)
exports.getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await UserModel.find()
      .select('-password')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    // Transform MongoDB _id to id for frontend compatibility
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    }));
    
    res.status(200).json({
      success: true,
      users: transformedUsers
    });
  } catch (error) {
    console.error("Error fetching all users for admin:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users', 
      error: error.message 
    });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await UserModel.countDocuments();
    const approvedUsers = await UserModel.countDocuments({ status: 'approved' });
    const pendingUsers = await UserModel.countDocuments({ status: 'pending' });
    const rejectedUsers = await UserModel.countDocuments({ status: 'rejected' });
    const adminUsers = await UserModel.countDocuments({ role: 'admin' });
    const totalClauses = await Clause.countDocuments();
    const totalTemplates = await Template.countDocuments();
    
    // Add agreements count - specifically signed agreements
    const Agreement = require('../models/Agreement');
    const totalAgreements = await Agreement.countDocuments();
    const signedAgreements = await Agreement.countDocuments({ status: 'signed' });

    res.status(200).json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      rejectedUsers,
      adminUsers,
      totalClauses,
      totalTemplates,
      totalAgreements: signedAgreements, // Show signed agreements count instead of total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};

exports.searchUsers = async (req, res) => {
  const { query } = req.query;

  // Validate query parameter
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Query parameter is required and must be a string' });
  }

  try {
    const users = await UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users', error });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;

  try {
    const user = await UserModel.findByIdAndUpdate(id, { name, email, role, status }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user', error });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    console.log("=== DELETE USER DEBUG ===");
    console.log("Request params:", req.params);
    console.log("Request user:", req.user);
    console.log("User ID to delete:", id);
    
    const user = await UserModel.findById(id);
    console.log("Found user:", user ? { id: user._id, name: user.name, email: user.email } : "User not found");
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Send deletion notification email to user before deleting
    const sendMail = require('../utilites/mailer');
    try {
      await sendMail(
        user.email,
        "Your IBD Contracting Account Has Been Deleted",
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background:#f9fafb; color:#333; padding:20px; }
            .container { max-width:600px; margin:auto; background:#fff; border:1px solid #ddd; border-radius:8px; padding:30px; }
            h1 { font-size:22px; color:#222; margin-bottom:15px; }
            p { font-size:16px; margin-bottom:20px; }
            .warning { background:#fef2f2; border:1px solid #fecaca; border-radius:5px; padding:15px; margin:20px 0; }
            .footer { font-size:13px; color:#777; margin-top:30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Deletion Notice</h1>
            <p>Hello ${user.name},</p>
            <div class="warning">
              <strong>Important:</strong> Your IBD Contracting account has been permanently deleted by an administrator.
            </div>
            <p>All your data, including agreements, templates, and personal information, has been removed from our system.</p>
            <p>If you believe this action was taken in error, please contact our support team immediately.</p>
            <p class="footer">Best regards,<br>The IBD Contracting Team</p>
          </div>
        </body>
        </html>
        `
      );
    } catch (emailError) {
      console.error("Error sending deletion email:", emailError);
      // Continue with deletion even if email fails
    }

    // Log the deletion activity
    try {
      await ActivityLog.create({
        usr_id: req.user.id, // Admin who deleted
        type: 'user_deleted',
        description: `Deleted user: ${user.name} (${user.email})`
      });
      console.log("Activity log created successfully");
    } catch (logError) {
      console.error("Error creating activity log:", logError);
      // Continue with deletion even if logging fails
    }

    // Delete the user
    console.log("Deleting user from database...");
    await UserModel.findByIdAndDelete(id);
    console.log("User deleted successfully from database");
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error in deleteUser function:", error);
    res.status(500).json({ message: 'Error deleting user', error });
  }
};

exports.getAllActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('usr_id', 'name email') // optional: include user name/email
      .sort({ timestamp: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ success: false, message: "Server error while fetching activity logs." });
  }
};

// Get pending users for approval
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await UserModel.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users: pendingUsers,
      count: pendingUsers.length
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ success: false, message: "Server error while fetching pending users." });
  }
};

// Approve user
exports.approveUser = async (req, res) => {
  try {
    console.log("=== APPROVE USER DEBUG ===");
    console.log("Request params:", req.params);
    console.log("Request user:", req.user);
    
    const { id } = req.params;
    
    const user = await UserModel.findById(id);
    console.log("Found user:", user ? { id: user._id, name: user.name, email: user.email, status: user.status } : "User not found");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== 'pending') {
      console.log("User status is not pending:", user.status);
      return res.status(400).json({ success: false, message: "User is not pending approval." });
    }

    console.log("Updating user status from", user.status, "to approved");
    user.status = 'approved';
    await user.save();
    console.log("User saved successfully");

    // Log the approval activity
    await ActivityLog.create({
      usr_id: req.user.id, // Admin who approved
      type: 'user_approved',
      description: `Approved user: ${user.name} (${user.email})`
    });

    // Send approval email to user
    const sendMail = require('../utilites/mailer');
    try {
      await sendMail(
        user.email,
        "Your IBD Contracting Account Has Been Approved!",
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background:#f9fafb; color:#333; padding:20px; }
            .container { max-width:600px; margin:auto; background:#fff; border:1px solid #ddd; border-radius:8px; padding:30px; }
            h1 { font-size:22px; color:#222; margin-bottom:15px; }
            p { font-size:16px; margin-bottom:20px; }
            a.button {
              display:inline-block; background-color:#4f46e5; color:#fff; padding:12px 25px;
              border-radius:5px; text-decoration:none; font-weight:bold; font-size:16px;
            }
            a.button:hover { background-color:#4338ca; }
            .footer { font-size:13px; color:#777; margin-top:30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to IBD Contracting! 🎉</h1>
            <p>Hello ${user.name},</p>
            <p>Great news! Your IBD Contracting account has been approved by our admin team.</p>
            <p>You can now log in and start collaborating on legal agreements:</p>
            <p><a href="${process.env.FRONTEND_URL}/login" class="button" target="_blank" rel="noopener noreferrer">Login to Your Account</a></p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p class="footer">Best regards,<br>The IBD Contracting Team</p>
          </div>
        </body>
        </html>
        `
      );
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
      // Don't fail the approval if email fails
    }

    // Emit notification to the approved user
    const io = req.app.get('io');
    if (io) {
      io.emit('user-approved', {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        approvedBy: req.user.id,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: "User approved successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ success: false, message: "Server error while approving user." });
  }
};

// Reject user
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({ success: false, message: "User is not pending approval." });
    }

    user.status = 'rejected';
    await user.save();

    // Log the rejection activity
    await ActivityLog.create({
      usr_id: req.user.id, // Admin who rejected
      type: 'user_rejected',
      description: `Rejected user: ${user.name} (${user.email})${reason ? ` - Reason: ${reason}` : ''}`
    });

    // Send rejection email to user
    const sendMail = require('../utilites/mailer');
    try {
      await sendMail(
        user.email,
        "Your IBD Contracting Account Application Status",
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background:#f9fafb; color:#333; padding:20px; }
            .container { max-width:600px; margin:auto; background:#fff; border:1px solid #ddd; border-radius:8px; padding:30px; }
            h1 { font-size:22px; color:#222; margin-bottom:15px; }
            p { font-size:16px; margin-bottom:20px; }
            .reason { background:#fef2f2; border:1px solid #fecaca; border-radius:5px; padding:15px; margin:20px 0; }
            .footer { font-size:13px; color:#777; margin-top:30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Application Update</h1>
            <p>Hello ${user.name},</p>
            <p>We regret to inform you that your IBD Contracting account application has not been approved at this time.</p>
            ${reason ? `<div class="reason"><strong>Reason:</strong> ${reason}</div>` : ''}
            <p>If you believe this decision was made in error or if you have additional information to provide, please contact our support team.</p>
            <p>Thank you for your interest in IBD Contracting.</p>
            <p class="footer">Best regards,<br>The IBD Contracting Team</p>
          </div>
        </body>
        </html>
        `
      );
    } catch (emailError) {
      console.error("Error sending rejection email:", emailError);
      // Don't fail the rejection if email fails
    }

    res.status(200).json({
      success: true,
      message: "User rejected successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Error rejecting user:", error);
    res.status(500).json({ success: false, message: "Server error while rejecting user." });
  }
};


// Template Management Functions
exports.getTemplates = async (req, res) => {
  try {
    const Template = require('../models/Template');
    const templates = await Template.find()
      .populate('userid', 'name email')
      .populate('clauses')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ success: false, message: "Server error while fetching templates." });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const Template = require('../models/Template');
    const { id } = req.params;
    
    const template = await Template.findById(id)
      .populate('userid', 'name email')
      .populate('clauses');
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: "Template not found" 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      template: template 
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ success: false, message: "Server error while fetching template." });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const Template = require('../models/Template');
    const { templatename, description, category, clauses, global_questions } = req.body;
    
    const template = new Template({
      templatename,
      description,
      category,
      clauses: clauses || [],
      global_questions: global_questions || [],
      userid: req.user.id,
      active: true,
      version: "1.0"
    });
    
    await template.save();
    
    // Log the template creation activity
    await ActivityLog.create({
      usr_id: req.user.id,
      type: 'template_created',
      description: `Created template: ${template.templatename}`
    });

    // Emit notification to admins
    const io = req.app.get('io');
    if (io) {
      io.emit('template-created', {
        templateId: template._id,
        templateName: template.templatename,
        createdBy: req.user.id,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template: template
    });
  } catch (error) {
    console.error("Error creating template:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      user: req.user
    });
    res.status(500).json({ 
      success: false, 
      message: "Server error while creating template.",
      error: error.message 
    });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const Template = require('../models/Template');
    const { id } = req.params;
    const { templatename, description, category, clauses, global_questions } = req.body;
    
    const template = await Template.findByIdAndUpdate(
      id,
      { templatename, description, category, clauses: clauses || [], global_questions: global_questions || [] },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    
    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template: template
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ success: false, message: "Server error while updating template." });
  }
};


// Clause Management Functions
exports.getClauses = async (req, res) => {
  try {
    const Clause = require('../models/clauseSchema');
    const clauses = await Clause.find();
    
    res.status(200).json({
      success: true,
      clauses: clauses
    });
  } catch (error) {
    console.error("Error fetching clauses:", error);
    res.status(500).json({ success: false, message: "Server error while fetching clauses." });
  }
};

exports.createClause = async (req, res) => {
  try {
    const Clause = require('../models/clauseSchema');
    const { name, description, category, required, status } = req.body;
    
    const clause = new Clause({
      name,
      description,
      category,
      required: required || false,
      status: status || 'active',
      createdBy: req.user.id,
      variants: []
    });
    
    await clause.save();
    
    // Log the clause creation activity
    await ActivityLog.create({
      usr_id: req.user.id,
      type: 'clause_created',
      description: `Created clause: ${clause.name}`
    });

    // Emit notification to admins
    const io = req.app.get('io');
    if (io) {
      io.emit('clause-created', {
        clauseId: clause._id,
        clauseName: clause.name,
        createdBy: req.user.id,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      message: "Clause created successfully",
      clause: clause
    });
  } catch (error) {
    console.error("Error creating clause:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      user: req.user
    });
    res.status(500).json({ 
      success: false, 
      message: "Server error while creating clause.",
      error: error.message 
    });
  }
};

exports.updateClause = async (req, res) => {
  try {
    const Clause = require('../models/clauseSchema');
    const { id } = req.params;
    const { name, description, category, required, status } = req.body;
    
    const clause = await Clause.findByIdAndUpdate(
      id,
      { name, description, category, required, status },
      { new: true }
    );
    
    if (!clause) {
      return res.status(404).json({ success: false, message: "Clause not found." });
    }
    
    res.status(200).json({
      success: true,
      message: "Clause updated successfully",
      clause: clause
    });
  } catch (error) {
    console.error("Error updating clause:", error);
    res.status(500).json({ success: false, message: "Server error while updating clause." });
  }
};

exports.deleteClause = async (req, res) => {
  try {
    const Clause = require('../models/clauseSchema');
    const { id } = req.params;
    
    const clause = await Clause.findByIdAndDelete(id);
    
    if (!clause) {
      return res.status(404).json({ success: false, message: "Clause not found." });
    }
    
    res.status(200).json({
      success: true,
      message: "Clause deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting clause:", error);
    res.status(500).json({ success: false, message: "Server error while deleting clause." });
  }
};

// Get all agreements for admin
exports.getAllAgreements = async (req, res) => {
  try {
    console.log("📋 Admin fetching all agreements");

    const Agreement = require('../models/Agreement');
    
    // Get all agreements with populated data
    const agreements = await Agreement.find({})
      .populate('templateId', 'templatename description')
      .populate('initiatorId', 'name email')
      .populate('invitedUserId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${agreements.length} agreements`);

    res.json({
      success: true,
      agreements: agreements
    });
  } catch (error) {
    console.error("Error fetching all agreements:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching agreements." 
    });
  }
};
