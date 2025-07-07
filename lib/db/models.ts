import mongoose, { Schema, Document as MongooseDocument } from "mongoose";
import { v4 as uuidv4 } from 'uuid';

//compilance enum
enum Compliance {
    GDPR = "GDPR",
    HIPAA = "HIPAA",
    PCI_DSS = "PCI_DSS",
    SOC_2 = "SOC_2",
}

interface IOptions {
    type: string;
    language: string;
    target_audience: string;
    jurisdiction: string;
    team_id: string;
    additional_instructions: string;
    compliance: Compliance[];
}

interface IDocument extends MongooseDocument {
    doc_id: string;
    title: string;
    url: string;
    options: IOptions;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
    doc_id: { type: String, required: true, unique: true, default: uuidv4, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    options: { type: Object, required: true },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Document = mongoose.models.Document || mongoose.model("Document", documentSchema);

// Add Analysis schema for storing document analysis results

interface IAnalysis extends MongooseDocument {
    /**
     * ID of the source document that this analysis belongs to. Optional because ad-hoc analyses may not be tied to a stored document.
     */
    doc_id?: string;
    document: string;
    documentType: string;
    targetAudience: string;
    jurisdiction: string;
    regulations: string;
    analysis: unknown; // JSON result from LLMs
    createdAt: Date;
}

const analysisSchema = new Schema<IAnalysis>({
    // Optional reference back to the original Document record
    doc_id: { type: String, required: false, index: true },
    documentType: { type: String, required: true },
    targetAudience: { type: String, required: true },
    jurisdiction: { type: String, required: true },
    regulations: { type: String, required: true },
    analysis: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Analysis = mongoose.models.Analysis || mongoose.model("Analysis", analysisSchema);

export { Analysis, Document };

