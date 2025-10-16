const Agreement = require('../models/Agreement');
const User = require('../models/User');
const sendMail = require('../utilites/mailer');
const logActivity = require('../utilites/logActivity');

// Socket.io instance (will be set by server.js)
let io = null;
const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Create agreement (initiator sends invite)
exports.createAgreement = async (req, res) => {
  try {
    const { templateId, inviteEmail, initiatorData } = req.body;
    const initiatorId = req.user.id;

    console.log("🚀 Creating agreement:", { templateId, inviteEmail, initiatorId });
    console.log("📋 InitatorData received:", JSON.stringify(initiatorData, null, 2));

    // Find the invited user by email
    const invitedUser = await User.findOne({ email: inviteEmail });
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: "User with this email not found"
      });
    }

    // Check if user is trying to invite themselves
    if (invitedUser._id.toString() === initiatorId) {
      return res.status(400).json({
        success: false,
        message: "You cannot invite yourself"
      });
    }

    // Check if the invited user is approved by admin
    if (invitedUser.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: "You can only invite users who are approved by the administrator"
      });
    }

    // Process the selected clauses with their order
    let processedSelectedClauses = [];
    if (initiatorData.selectedClauses && initiatorData.clauseVariantsOrder) {
      processedSelectedClauses = initiatorData.selectedClauses.map(clause => {
        const clauseOrder = initiatorData.clauseVariantsOrder[clause.clause_name];
        const variantOrder = clauseOrder?.find(v => v.variant_label === clause.variant.variant_label)?.order || 0;

        return {
          ...clause,
          order: variantOrder
        };
      });
    }

    // Create the agreement
    console.log("🔨 Creating agreement with processed data:", {
      templateId,
      initiatorId,
      invitedUserId: invitedUser._id,
      initiatorData: {
        intakeAnswers: initiatorData.intakeAnswers || {},
        selectedClauses: processedSelectedClauses,
        clauseVariantsOrder: initiatorData.clauseVariantsOrder || {}
      }
    });

    const agreement = new Agreement({
      templateId,
      initiatorId,
      invitedUserId: invitedUser._id,
      initiatorData: {
        intakeAnswers: initiatorData.intakeAnswers || {},
        selectedClauses: processedSelectedClauses,
        clauseVariantsOrder: initiatorData.clauseVariantsOrder || {}
      },
      status: 'pending'
    });

    try {
      await agreement.save();
      console.log("✅ Agreement created successfully:", agreement._id);
    } catch (saveError) {
      console.error("❌ Error saving agreement:", saveError);
      console.error("❌ Save error details:", {
        name: saveError.name,
        message: saveError.message,
        errors: saveError.errors
      });
      throw saveError;
    }

    // Send email notification to the invited user
    try {
      const initiator = await User.findById(initiatorId);
      const template = await require('../models/Template').findById(templateId);
      
      const emailSubject = `You're invited to collaborate on an agreement - ${template?.templatename || 'Legal Agreement'}`;
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Agreement Invitation</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              background: #f8fafc; 
              color: #1e293b; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: #ffffff; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); 
              color: white; 
              padding: 32px; 
              text-align: center; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
              font-weight: 600; 
            }
            .content { 
              padding: 32px; 
            }
            .invitation-details { 
              background: #f1f5f9; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
            }
            .button { 
              display: inline-block; 
              background: #4f46e5; 
              color: white; 
              padding: 14px 28px; 
              border-radius: 8px; 
              text-decoration: none; 
              font-weight: 600; 
              font-size: 16px; 
              margin: 20px 0; 
              transition: background-color 0.2s;
            }
            .button:hover { 
              background: #4338ca; 
            }
            .footer { 
              background: #f8fafc; 
              padding: 24px 32px; 
              text-align: center; 
              color: #64748b; 
              font-size: 14px; 
            }
            .highlight { 
              color: #4f46e5; 
              font-weight: 600; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Agreement Invitation</h1>
            </div>
            <div class="content">
              <p>Hello <span class="highlight">${invitedUser.name}</span>,</p>
              
              <p>You have been invited by <span class="highlight">${initiator.name}</span> to collaborate on a legal agreement using our platform.</p>
              
              <div class="invitation-details">
                <h3 style="margin-top: 0; color: #1e293b;">Agreement Details:</h3>
                <p><strong>Template:</strong> ${template?.templatename || 'Legal Agreement'}</p>
                <p><strong>Description:</strong> ${template?.description || 'No description available'}</p>
                <p><strong>Initiator:</strong> ${initiator.name} (${initiator.email})</p>
              </div>
              
              <p>To review and complete your part of the agreement, please log in to your account and check your dashboard.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Login to Review Agreement</a>
              </div>
              
              <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
                <strong>What's next?</strong><br>
                1. Log in to your account<br>
                2. Check your dashboard for pending invites<br>
                3. Complete your intake form with your preferences<br>
                4. Review the agreement compatibility analysis
              </p>
            </div>
            <div class="footer">
              <p>This invitation was sent from IBD Contracting Platform</p>
              <p>If you didn't expect this invitation, please contact the administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendMail(inviteEmail, emailSubject, emailHtml);
      console.log("📧 Email notification sent to:", inviteEmail);
    } catch (emailError) {
      console.error("❌ Failed to send email notification:", emailError);
      // Don't fail the agreement creation if email fails
    }

    res.status(201).json({
      success: true,
      message: "Agreement created and invite sent successfully",
      agreementId: agreement._id
    });
  } catch (error) {
    console.error("Error creating agreement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating agreement"
    });
  }
};

// Update agreement when either party updates their intake
exports.updateAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { initiatorData, invitedUserData } = req.body;
    const userId = req.user.id;

    console.log("📝 Updating agreement:", agreementId, "for user:", userId);

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found"
      });
    }

    // Check if user is part of this agreement
    const isInitiator = agreement.initiatorId.toString() === userId.toString();
    const isInvited = agreement.invitedUserId.toString() === userId.toString();

    console.log("🔍 Authorization check for update:", {
      userId: userId.toString(),
      initiatorId: agreement.initiatorId.toString(),
      invitedUserId: agreement.invitedUserId.toString(),
      isInitiator,
      isInvited
    });

    if (!isInitiator && !isInvited) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this agreement"
      });
    }

    let processedSelectedClauses = [];
    let updatedData = {};

    // Update based on which party is updating
    if (isInitiator && initiatorData) {
      console.log("📝 Updating initiator data");
      console.log("📊 Received selected clauses:", initiatorData.selectedClauses);
      console.log("🔢 Received clause variants order:", initiatorData.clauseVariantsOrder);
      
      // Process the selected clauses with their order
      if (initiatorData.selectedClauses && initiatorData.clauseVariantsOrder) {
        processedSelectedClauses = initiatorData.selectedClauses.map(clause => {
          const clauseOrder = initiatorData.clauseVariantsOrder[clause.clause_name];
          const variantOrder = clauseOrder?.find(v => v.variant_label === clause.variant.variant_label)?.order || 1;

          console.log(`🔍 Processing clause: ${clause.clause_name}, variant: ${clause.variant.variant_label}, order: ${variantOrder}`);

          return {
            ...clause,
            order: variantOrder
          };
        });
      }

      updatedData = {
        intakeAnswers: initiatorData.intakeAnswers || {},
        selectedClauses: processedSelectedClauses,
        clauseVariantsOrder: initiatorData.clauseVariantsOrder || {}
      };
      console.log("✅ Final processed initiator data:", processedSelectedClauses.map(sc => ({
        clause_name: sc.clause_name,
        variant: sc.variant.variant_label,
        status: sc.status,
        order: sc.order
      })));
      agreement.initiatorData = updatedData;
      
    } else if (isInvited && invitedUserData) {
      console.log("📝 Updating invited user data");
      console.log("📊 Received selected clauses:", invitedUserData.selectedClauses);
      console.log("🔢 Received clause variants order:", invitedUserData.clauseVariantsOrder);
      
      // Process the selected clauses with their order
      if (invitedUserData.selectedClauses && invitedUserData.clauseVariantsOrder) {
        processedSelectedClauses = invitedUserData.selectedClauses.map(clause => {
          const clauseOrder = invitedUserData.clauseVariantsOrder[clause.clause_name];
          const variantOrder = clauseOrder?.find(v => v.variant_label === clause.variant.variant_label)?.order || 1;

          console.log(`🔍 Processing clause: ${clause.clause_name}, variant: ${clause.variant.variant_label}, order: ${variantOrder}`);

          return {
            ...clause,
            order: variantOrder
          };
        });
      }

      updatedData = {
        intakeAnswers: invitedUserData.intakeAnswers || {},
        selectedClauses: processedSelectedClauses,
        clauseVariantsOrder: invitedUserData.clauseVariantsOrder || {}
      };
      console.log("✅ Final processed invited user data:", processedSelectedClauses.map(sc => ({
        clause_name: sc.clause_name,
        variant: sc.variant.variant_label,
        status: sc.status,
        order: sc.order
      })));
      agreement.invitedUserData = updatedData;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided for update"
      });
    }

    // Only calculate matching results if both parties have data
    if (agreement.initiatorData.selectedClauses?.length > 0 && agreement.invitedUserData.selectedClauses?.length > 0) {
      console.log("🎯 Both parties have data, calculating matching results");
      const matchingResults = calculateMatchingResults(
        agreement.initiatorData.selectedClauses,
        agreement.invitedUserData.selectedClauses
      );
      agreement.matchingResults = matchingResults;
      agreement.status = 'active';

      console.log("🎯 AGREEMENT MATCHING COMPLETED");
      console.log("Agreement matches:", matchingResults.filter(r => r.matchStatus === 'green').length);
      console.log("Partial matches:", matchingResults.filter(r => r.matchStatus === 'yellow').length);
      console.log("Conflicts:", matchingResults.filter(r => r.matchStatus === 'red').length);
    } else {
      console.log("⏳ Waiting for both parties to complete their intake");
      agreement.status = 'pending';
    }

    await agreement.save();

    console.log("Agreement updated successfully");

    res.status(200).json({
      success: true,
      message: "Agreement updated successfully",
      matchingResults: agreement.matchingResults || []
    });
  } catch (error) {
    console.error("Error updating agreement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating agreement"
    });
  }
};

// Get agreement details
exports.getAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const userId = req.user.id;

    console.log("🔍 Getting agreement:", agreementId, "for user:", userId);

    const agreement = await Agreement.findById(agreementId)
      .populate('templateId')
      .populate('initiatorId', 'name email')
      .populate('invitedUserId', 'name email');

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found"
      });
    }

    // Check if user is part of this agreement
    const isInitiator = agreement.initiatorId._id.toString() === userId.toString();
    const isInvited = agreement.invitedUserId._id.toString() === userId.toString();

    console.log("🔍 Authorization check:", {
      userId: userId.toString(),
      initiatorId: agreement.initiatorId._id.toString(),
      invitedUserId: agreement.invitedUserId._id.toString(),
      isInitiator,
      isInvited
    });

    if (!isInitiator && !isInvited) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this agreement"
      });
    }

    console.log("✅ Agreement found and authorized");

    res.status(200).json({
      success: true,
      agreement
    });
  } catch (error) {
    console.error("Error getting agreement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while getting agreement"
    });
  }
};

// Get user's agreements
exports.getUserAgreements = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("🔍 Getting agreements for user:", userId);

    const agreements = await Agreement.find({
      $or: [
        { initiatorId: userId },
        { invitedUserId: userId }
      ]
    })
    .populate('templateId', 'templatename description')
    .populate('initiatorId', 'name email')
    .populate('invitedUserId', 'name email')
    .sort({ createdAt: -1 });

    console.log("📋 Found agreements:", agreements.length);

    res.status(200).json({
      success: true,
      agreements
    });
  } catch (error) {
    console.error("Error getting user agreements:", error);
    res.status(500).json({
      success: false,
      message: "Server error while getting agreements"
    });
  }
};

// Get user's pending invites
exports.getPendingInvites = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("🔍 Getting pending invites for user:", userId);

    const pendingAgreements = await Agreement.find({
      'invitedUserId': userId,
      status: 'pending'
    })
    .populate('templateId', 'templatename description')
    .populate('initiatorId', 'name email')
    .sort({ createdAt: -1 });

    console.log("📋 Found pending invites:", pendingAgreements.length);

    res.status(200).json({
      success: true,
      pendingInvites: pendingAgreements
    });
  } catch (error) {
    console.error("Error getting pending invites:", error);
    res.status(500).json({
      success: false,
      message: "Server error while getting pending invites"
    });
  }
};

// New Matching Logic Algorithm
const calculateMatchingResults = (initiatorClauses, invitedUserClauses) => {
  console.log("🎯 Starting NEW matching algorithm");
  
  const results = [];
  
  // Group clauses by clause_name
  const clauseGroups = new Map();
  
  // Process initiator clauses
  initiatorClauses.forEach(clause => {
    if (!clauseGroups.has(clause.clause_name)) {
      clauseGroups.set(clause.clause_name, {
        clause_name: clause.clause_name,
        initiatorVariants: [],
        invitedUserVariants: []
      });
    }
    clauseGroups.get(clause.clause_name).initiatorVariants.push(clause);
  });
  
  // Process invited user clauses
  invitedUserClauses.forEach(clause => {
    if (!clauseGroups.has(clause.clause_name)) {
      clauseGroups.set(clause.clause_name, {
        clause_name: clause.clause_name,
        initiatorVariants: [],
        invitedUserVariants: []
      });
    }
    clauseGroups.get(clause.clause_name).invitedUserVariants.push(clause);
  });
  
  // Process each clause group
  for (const [clauseName, group] of clauseGroups) {
    console.log(`\n🔍 Processing clause: ${clauseName}`);
    
    // Step 1: Identify mutually acceptable variants
    const initiatorAccepted = group.initiatorVariants.filter(v => v.status === 'accepted');
    const invitedUserAccepted = group.invitedUserVariants.filter(v => v.status === 'accepted');
    
    console.log(`   Initiator accepted: ${initiatorAccepted.length} variants`);
    console.log(`   Invited user accepted: ${invitedUserAccepted.length} variants`);
    
    // Find overlap (mutually acceptable variants)
    const mutuallyAcceptable = [];
    
    initiatorAccepted.forEach(initVariant => {
      const matchingInvitedVariant = invitedUserAccepted.find(invVariant => 
        invVariant.variant.variant_label === initVariant.variant.variant_label
      );
      
      if (matchingInvitedVariant) {
        mutuallyAcceptable.push({
          variant: initVariant.variant,
          initiatorOrder: initVariant.order,
          invitedUserOrder: matchingInvitedVariant.order,
          initiatorRank: initVariant.order,
          invitedUserRank: matchingInvitedVariant.order
        });
      }
    });
    
    console.log(`   Mutually acceptable variants: ${mutuallyAcceptable.length}`);
    
    // Step 2: Determine result
    let result = {
      clause_name: clauseName,
      selectedVariant: null,
      matchStatus: '',
      reason: '',
      score: null,
      initiatorRank: null,
      invitedUserRank: null,
      mutuallyAcceptableVariants: mutuallyAcceptable,
      allVariants: {
        initiator: group.initiatorVariants,
        invitedUser: group.invitedUserVariants
      }
    };
    
    if (mutuallyAcceptable.length === 0) {
      // Red Light - No overlap
      result.matchStatus = 'red';
      result.reason = 'No mutually acceptable variants - requires escalation';
      console.log(`   ❌ RED LIGHT: No mutually acceptable variants`);
    } else if (mutuallyAcceptable.length === 1) {
      // Auto-select single variant
      const variant = mutuallyAcceptable[0];
      result.matchStatus = 'green';
      result.selectedVariant = variant.variant;
      result.initiatorRank = variant.initiatorRank;
      result.invitedUserRank = variant.invitedUserRank;
      result.reason = 'Auto-selected: only one mutually acceptable variant';
      console.log(`   ✅ AUTO-SELECTED: ${variant.variant.variant_label}`);
    } else {
      // Multiple variants - check if both ranked same variant #1
      const bothRankedFirst = mutuallyAcceptable.find(variant => 
        variant.initiatorRank === 1 && variant.invitedUserRank === 1
      );
      
      if (bothRankedFirst) {
        // Auto-select if both ranked same variant #1
        result.matchStatus = 'green';
        result.selectedVariant = bothRankedFirst.variant;
        result.initiatorRank = bothRankedFirst.initiatorRank;
        result.invitedUserRank = bothRankedFirst.invitedUserRank;
        result.reason = 'Auto-selected: both parties ranked same variant #1';
        console.log(`   ✅ AUTO-SELECTED: Both ranked ${bothRankedFirst.variant.variant_label} #1`);
      } else {
        // Step 3: Score remaining variants using new formula
        // S = (RankA + RankB) + |RankA - RankB|
        const scoredVariants = mutuallyAcceptable.map(variant => {
          const score = (variant.initiatorRank + variant.invitedUserRank) + 
                       Math.abs(variant.initiatorRank - variant.invitedUserRank);
          return {
            ...variant,
            score: score,
            gap: Math.abs(variant.initiatorRank - variant.invitedUserRank),
            totalSum: variant.initiatorRank + variant.invitedUserRank
          };
        });
        
        // Sort by score (lowest first)
        scoredVariants.sort((a, b) => a.score - b.score);
        
        // Step 4: Handle ties
        const bestScore = scoredVariants[0].score;
        const tiedVariants = scoredVariants.filter(v => v.score === bestScore);
        
        let selectedVariant;
        if (tiedVariants.length === 1) {
          selectedVariant = tiedVariants[0];
        } else {
          // Break ties: prefer smaller gap
          tiedVariants.sort((a, b) => a.gap - b.gap);
          const smallestGap = tiedVariants[0].gap;
          const smallestGapVariants = tiedVariants.filter(v => v.gap === smallestGap);
          
          if (smallestGapVariants.length === 1) {
            selectedVariant = smallestGapVariants[0];
          } else {
            // Break ties: prefer lower total sum
            smallestGapVariants.sort((a, b) => a.totalSum - b.totalSum);
            const lowestSum = smallestGapVariants[0].totalSum;
            const lowestSumVariants = smallestGapVariants.filter(v => v.totalSum === lowestSum);
            
            if (lowestSumVariants.length === 1) {
              selectedVariant = lowestSumVariants[0];
            } else {
              // Random selection for final tie
              selectedVariant = lowestSumVariants[Math.floor(Math.random() * lowestSumVariants.length)];
            }
          }
        }
        
        result.matchStatus = 'green';
        result.selectedVariant = selectedVariant.variant;
        result.initiatorRank = selectedVariant.initiatorRank;
        result.invitedUserRank = selectedVariant.invitedUserRank;
        result.score = selectedVariant.score;
        result.reason = `Selected by scoring: S=${selectedVariant.score}, gap=${selectedVariant.gap}, sum=${selectedVariant.totalSum}`;
        
        console.log(`   ✅ SCORED SELECTION: ${selectedVariant.variant.variant_label}`);
        console.log(`   Score: ${selectedVariant.score}, Gap: ${selectedVariant.gap}, Sum: ${selectedVariant.totalSum}`);
      }
    }
    
    results.push(result);
  }
  
  console.log(`\n🎯 NEW MATCHING COMPLETED`);
  console.log(`Green lights: ${results.filter(r => r.matchStatus === 'green').length}`);
  console.log(`Red lights: ${results.filter(r => r.matchStatus === 'red').length}`);
  
  return results;
};

// Sign agreement
exports.signAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const userId = req.user.id;

    console.log("✍️ Signing agreement:", { agreementId, userId });

    // Find the agreement
    const agreement = await Agreement.findById(agreementId)
      .populate('initiatorId', 'name email signature')
      .populate('invitedUserId', 'name email signature');

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found"
      });
    }

    // Check if user is part of this agreement
    const isInitiator = agreement.initiatorId._id.toString() === userId;
    const isInvitedUser = agreement.invitedUserId._id.toString() === userId;

    if (!isInitiator && !isInvitedUser) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to sign this agreement"
      });
    }

    // Check if user has a signature
    const user = isInitiator ? agreement.initiatorId : agreement.invitedUserId;
    if (!user.signature || !user.signature.url) {
      return res.status(400).json({
        success: false,
        message: "You must upload a signature first. Please go to your profile to upload a signature.",
        redirectTo: "/profile"
      });
    }

    // Check if already signed
    const signatureField = isInitiator ? 'initiatorSignature' : 'invitedUserSignature';
    if (agreement.signatures[signatureField].signed) {
      return res.status(400).json({
        success: false,
        message: "You have already signed this agreement"
      });
    }

    // Update signature
    agreement.signatures[signatureField] = {
      signed: true,
      signedAt: new Date(),
      signatureUrl: user.signature.url
    };

    // Check if both parties have signed
    const bothSigned = agreement.signatures.initiatorSignature.signed && 
                      agreement.signatures.invitedUserSignature.signed;

    if (bothSigned) {
      agreement.status = 'signed';
    }

    await agreement.save();

    // Log the signing activity
    await logActivity({
      usr_id: userId,
      type: 'agreement_signed',
      description: `User signed agreement: ${agreement.templateId.templatename || 'Agreement'}`
    });

    // Emit socket event for real-time updates
    if (io) {
      const user = await User.findById(userId).select('name');
      io.to(`agreement-${agreementId}`).emit('signature-updated', {
        agreementId,
        userId,
        userName: user.name,
        timestamp: new Date(),
        bothSigned
      });
    }

    console.log("✅ Agreement signed successfully");

    res.status(200).json({
      success: true,
      message: bothSigned ? "Agreement fully signed by both parties!" : "Your signature has been recorded",
      agreement: {
        _id: agreement._id,
        status: agreement.status,
        signatures: agreement.signatures
      }
    });

  } catch (error) {
    console.error("Error signing agreement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while signing agreement"
    });
  }
};

// Download agreement PDF (only agreed clauses)
exports.downloadAgreementPDF = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const userId = req.user.id;

    console.log("📄 Generating PDF for agreement:", agreementId);

    // Find the agreement with populated data
    const agreement = await Agreement.findById(agreementId)
      .populate('templateId')
      .populate('initiatorId', 'name email signature')
      .populate('invitedUserId', 'name email signature');

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found"
      });
    }

    // Check if user is part of this agreement
    const isInitiator = agreement.initiatorId._id.toString() === userId;
    const isInvitedUser = agreement.invitedUserId._id.toString() === userId;

    if (!isInitiator && !isInvitedUser) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to download this agreement"
      });
    }

    // Ensure matching results are calculated
    if (!agreement.matchingResults || agreement.matchingResults.length === 0) {
      console.log("🔄 No matching results found, calculating...");
      const matchingResults = calculateMatchingResults(
        agreement.initiatorData.selectedClauses,
        agreement.invitedUserData.selectedClauses
      );
      agreement.matchingResults = matchingResults;
      await agreement.save();
    }

    console.log("📊 Matching results:", agreement.matchingResults.length);
    console.log("✅ Selected variants:", agreement.matchingResults.filter(r => r.selectedVariant).length);

    // Filter for only green matches with selectedVariant
    const agreedClauses = agreement.matchingResults.filter(result => 
      result.matchStatus === 'green' && result.selectedVariant !== null
    );

    console.log("🎯 Agreed clauses for PDF:", agreedClauses.length);

    // Generate PDF content
    const pdfContent = await generateAgreementPDFContent(agreement, agreedClauses);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="agreement-${agreementId}.pdf"`);

    // Send PDF content
    res.send(pdfContent);

    console.log("✅ PDF generated and sent successfully");

  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message
    });
  }
};

// Helper function to generate PDF content
const generateAgreementPDFContent = (agreement, agreedClauses) => {
  return new Promise(async (resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      
      // Helper function to add signature image to PDF
      const addSignatureImage = async (signatureUrl, doc, x, y, width = 200, height = 80) => {
        try {
          if (signatureUrl) {
            console.log('🖼️ Fetching signature image from:', signatureUrl);
            
            // Fetch the signature image
            const https = require('https');
            const http = require('http');
            
            return new Promise((resolve) => {
              const protocol = signatureUrl.startsWith('https') ? https : http;
              
              // Set timeout for the request
              const request = protocol.get(signatureUrl, { timeout: 10000 }, (response) => {
                console.log('📡 Image fetch response status:', response.statusCode);
                
                if (response.statusCode === 200) {
                  const chunks = [];
                  
                  response.on('data', (chunk) => {
                    chunks.push(chunk);
                  });
                  
                  response.on('end', async () => {
                    try {
                      const imageBuffer = Buffer.concat(chunks);
                      console.log('✅ Image buffer size:', imageBuffer.length);

                      // Convert any image format to PNG using Sharp
                      const sharp = require('sharp');
                      const convertedBuffer = await sharp(imageBuffer)
                        .png()
                        .toBuffer();

                      console.log('✅ Image converted to PNG, size:', convertedBuffer.length);

                      // Add the converted image to the PDF
                      doc.image(convertedBuffer, x, y, {
                        width: width,
                        height: height,
                        fit: [width, height]
                      });

                      console.log('✅ Signature image added to PDF successfully');
                      resolve(true);
                    } catch (error) {
                      console.log('❌ Error processing/converting image:', error);
                      doc.text('Signature: [Digital Signature Applied]', x, y);
                      resolve(false);
                    }
                  });
                } else {
                  console.log('❌ Could not fetch signature image, status:', response.statusCode);
                  doc.text('Signature: [Digital Signature Applied]', x, y);
                  resolve(false);
                }
              });
              
              // Set timeout for the request
              request.setTimeout(10000, () => {
                console.log('⏰ Signature image fetch timeout');
                request.destroy();
                doc.text('Signature: [Digital Signature Applied]', x, y);
                resolve(false);
              });
              
              request.on('error', (error) => {
                console.log('❌ Error fetching signature image:', error);
                doc.text('Signature: [Digital Signature Applied]', x, y);
                resolve(false);
              });
            });
          } else {
            console.log('❌ No signature URL provided');
            doc.text('Signature: [Digital Signature Applied]', x, y);
            return false;
          }
        } catch (error) {
          console.log('❌ Could not add signature image:', error);
          doc.text('Signature: [Digital Signature Applied]', x, y);
          return false;
        }
      };
      
      // Collect PDF data
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);
      
      // PDF Header
      doc.fontSize(20).text('LEGAL AGREEMENT', { align: 'center' });
      doc.fontSize(16).text(agreement.templateId.templatename, { align: 'center' });
      doc.moveDown();
      
      // Agreement Info
      doc.fontSize(12);
      doc.text(`Agreement ID: ${agreement._id}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Status: ${agreement.status.toUpperCase()}`);
      doc.moveDown();
      
      // Parties Information
      doc.fontSize(14).text('PARTIES', { underline: true });
      doc.fontSize(12);
      doc.text(`Initiator: ${agreement.initiatorId.name} (${agreement.initiatorId.email})`);
      doc.text(`Invited Party: ${agreement.invitedUserId.name} (${agreement.invitedUserId.email})`);
      doc.moveDown();
      
      // Agreement Summary Section
      doc.fontSize(14).text('AGREEMENT SUMMARY', { underline: true });
      doc.moveDown();
      
      const totalClauses = agreement.matchingResults.length;
      const selectedClauses = agreedClauses.length;
      const redLightClauses = agreement.matchingResults.filter(r => r.matchStatus === 'red').length;
      
      doc.fontSize(12).text(`Total Clauses Reviewed: ${totalClauses}`);
      doc.text(`Successfully Matched Clauses: ${selectedClauses}`);
      doc.text(`Red Light Clauses (No Match): ${redLightClauses}`);
      doc.moveDown();
      
      // Selected Clauses Section - Enhanced display
      doc.fontSize(14).text('FINAL AGREEMENT CLAUSES', { underline: true });
      doc.fontSize(10).text('The following clauses represent the specific terms selected by the matching algorithm:', { italic: true });
      doc.moveDown();
      
      if (agreedClauses.length === 0) {
        doc.fontSize(12).text('No mutually agreed clauses found.', { align: 'center' });
        doc.fontSize(10).text('This agreement contains no clauses that both parties have accepted.', { align: 'center', italic: true });
      } else {
        agreedClauses.forEach((matchingResult, index) => {
          // Safety check for matching result
          if (!matchingResult || !matchingResult.selectedVariant) {
            console.log(`⚠️ Skipping clause ${matchingResult.clause_name} - no valid selected variant`);
            return;
          }
          
          // Clause type header with enhanced formatting
          doc.fontSize(13).text(`${index + 1}. ${matchingResult.clause_name.toUpperCase()}`, { underline: true });
          doc.moveDown(0.3);
          
          // Show only the selected variant (the one chosen by the matching algorithm)
          const selectedVariant = matchingResult.selectedVariant;
          
          // Selected variant header
          doc.fontSize(11).text(`   Selected Variant: ${selectedVariant.variant_label || 'Unknown'}`, { indent: 20, underline: true });
          doc.moveDown(0.2);
          
          // Selected variant text
          doc.fontSize(10).text(`      "${selectedVariant.text || 'No text available'}"`, { indent: 30, lineGap: 2 });
          doc.moveDown(0.2);
          
          // Show best_used_when if available
          if (selectedVariant.best_used_when && selectedVariant.best_used_when.trim()) {
            doc.fontSize(9).text(`      Best Used When: ${selectedVariant.best_used_when}`, { indent: 30, italic: true });
            doc.moveDown(0.2);
          }
          
          // No technical details needed in PDF
          
          doc.moveDown(0.5);
        });
        
        // Add summary of agreement
        doc.moveDown();
        doc.fontSize(12).text('AGREEMENT CONFIRMATION', { underline: true });
        doc.fontSize(10).text(`This document contains the final agreement with ${agreedClauses.length} clause(s) that were successfully matched using the algorithm.`, { lineGap: 2 });
        doc.text(`Each clause shows the specific variant selected by the matching algorithm based on both parties' preferences.`, { lineGap: 2 });
        doc.text(`Red Light clauses (no mutually acceptable variants) are not included in this agreement.`, { lineGap: 2 });
        doc.moveDown();
      }
      
      // Signatures Section with images
      doc.fontSize(14).text('SIGNATURES', { underline: true });
      doc.moveDown();
      
      console.log('🔍 Signatures debug:', {
        hasSignatures: !!agreement.signatures,
        initiatorSigned: agreement.signatures?.initiatorSignature?.signed,
        invitedSigned: agreement.signatures?.invitedUserSignature?.signed,
        initiatorUrl: agreement.signatures?.initiatorSignature?.signatureUrl,
        invitedUrl: agreement.signatures?.invitedUserSignature?.signatureUrl,
        initiatorProfileUrl: agreement.initiatorId?.signature?.url,
        invitedProfileUrl: agreement.invitedUserId?.signature?.url,
        fullSignaturesObject: JSON.stringify(agreement.signatures, null, 2)
      });
      
      if (agreement.signatures) {
        // Initiator signature
        if (agreement.signatures.initiatorSignature && agreement.signatures.initiatorSignature.signed) {
          console.log('📝 Processing initiator signature...');
          doc.fontSize(12).text(`Initiator: ${agreement.initiatorId.name}`);
          doc.text(`Signed on: ${new Date(agreement.signatures.initiatorSignature.signedAt).toLocaleDateString()}`);
          
          // Add signature image if available
          const initiatorSignatureUrl = agreement.signatures.initiatorSignature.signatureUrl || 
                                       agreement.initiatorId.signature?.url;
          
          if (initiatorSignatureUrl) {
            console.log('🖼️ Adding initiator signature image from:', initiatorSignatureUrl);
            try {
              const imageAdded = await addSignatureImage(
                initiatorSignatureUrl, 
                doc, 
                50, 
                doc.y + 10,
                200,
                80
              );
              console.log('✅ Initiator image added:', imageAdded);
              if (imageAdded) {
                doc.y += 100; // Move down after signature image
              } else {
                doc.y += 20; // Move down after text
              }
            } catch (imageError) {
              console.error('❌ Error adding initiator signature image:', imageError);
              doc.text('Signature: [Digital Signature Applied]', 50, doc.y + 10);
              doc.y += 20;
            }
          } else {
            console.log('❌ No initiator signature URL found');
            doc.text('Signature: [Digital Signature Applied]', 50, doc.y + 10);
            doc.y += 20;
          }
          doc.moveDown();
        } else {
          console.log('❌ Initiator signature not found or not signed');
        }
        
        // Invited user signature
        if (agreement.signatures.invitedUserSignature && agreement.signatures.invitedUserSignature.signed) {
          console.log('📝 Processing invited user signature...');
          doc.fontSize(12).text(`Invited Party: ${agreement.invitedUserId.name}`);
          doc.text(`Signed on: ${new Date(agreement.signatures.invitedUserSignature.signedAt).toLocaleDateString()}`);
          
          // Add signature image if available
          const invitedSignatureUrl = agreement.signatures.invitedUserSignature.signatureUrl || 
                                     agreement.invitedUserId.signature?.url;
          
          if (invitedSignatureUrl) {
            console.log('🖼️ Adding invited user signature image from:', invitedSignatureUrl);
            try {
              const imageAdded = await addSignatureImage(
                invitedSignatureUrl, 
                doc, 
                50, 
                doc.y + 10,
                200,
                80
              );
              console.log('✅ Invited user image added:', imageAdded);
              if (imageAdded) {
                doc.y += 100; // Move down after signature image
              } else {
                doc.y += 20; // Move down after text
              }
            } catch (imageError) {
              console.error('❌ Error adding invited user signature image:', imageError);
              doc.text('Signature: [Digital Signature Applied]', 50, doc.y + 10);
              doc.y += 20;
            }
          } else {
            console.log('❌ No invited user signature URL found');
            doc.text('Signature: [Digital Signature Applied]', 50, doc.y + 10);
            doc.y += 20;
          }
          doc.moveDown();
        } else {
          console.log('❌ Invited user signature not found or not signed');
        }
      } else {
        console.log('❌ No signatures object found');
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Delete agreement (only by initiator)
const deleteAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const userId = req.user.id;

    console.log("🗑️ Deleting agreement:", agreementId, "by user:", userId);

    // Find the agreement
    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found"
      });
    }

    // Check if user is the initiator
    if (agreement.initiatorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the agreement initiator can delete this agreement"
      });
    }

    // Check if agreement is already signed (cannot delete signed agreements)
    if (agreement.status === 'signed' || 
        (agreement.signatures?.initiatorSignature?.signed && agreement.signatures?.invitedUserSignature?.signed)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a signed agreement. Signed agreements are permanent and cannot be deleted."
      });
    }

    // Delete the agreement
    await Agreement.findByIdAndDelete(agreementId);

    console.log("✅ Agreement deleted successfully:", agreementId);

    res.json({
      success: true,
      message: "Agreement deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting agreement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete agreement",
      error: error.message
    });
  }
};

// Export the matching function and socket setter
module.exports.calculateMatchingResults = calculateMatchingResults;
module.exports.setSocketIO = setSocketIO;
module.exports.deleteAgreement = deleteAgreement;
