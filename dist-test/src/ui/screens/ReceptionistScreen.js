import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Button, Card, Container, Divider, Group, Loader, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { filterDepartmentsForBranch } from "../../application/services/branchDepartmentPolicy";
import { registerCorrespondenceInHost } from "../../application/modules/intake/registerCorrespondence";
import { systemConfig } from "../../config/systemConfig";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { DataRow } from "../components/DataRow";
const directionOptions = [
    { value: "INCOMING", label: "Incoming" },
    { value: "OUTGOING", label: "Outgoing" }
];
function getDirectionFromQuery(rawValue) {
    return rawValue === "OUTGOING" ? "OUTGOING" : "INCOMING";
}
function getDirectionBadgeColor(direction) {
    return direction === "INCOMING" ? "blue" : "dark";
}
export function ReceptionistScreen(props) {
    const { currentUser } = props;
    const [searchParams] = useSearchParams();
    const [subject, setSubject] = useState("");
    const [branchId, setBranchId] = useState(currentUser.branchId);
    const [departmentId, setDepartmentId] = useState(currentUser.departmentId);
    const [direction, setDirection] = useState(() => getDirectionFromQuery(searchParams.get("direction")));
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        let active = true;
        async function loadFormData() {
            try {
                setLoading(true);
                const [loadedBranches, loadedDepartments] = await Promise.all([
                    runtimeHostAdapter.branches.findAll(),
                    runtimeHostAdapter.departments.findAll()
                ]);
                if (!active) {
                    return;
                }
                setBranches(loadedBranches);
                setDepartments(loadedDepartments);
                setBranchId((current) => current ?? loadedBranches[0]?.id ?? null);
                setDepartmentId((current) => current ?? loadedDepartments[0]?.id ?? null);
            }
            catch (loadError) {
                if (!active) {
                    return;
                }
                setError(loadError instanceof Error ? loadError.message : "Unable to load registration data.");
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        void loadFormData();
        return () => {
            active = false;
        };
    }, []);
    useEffect(() => {
        setDirection(getDirectionFromQuery(searchParams.get("direction")));
    }, [searchParams]);
    const branchOptions = useMemo(() => branches.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })), [branches]);
    const allowedDepartments = useMemo(() => filterDepartmentsForBranch(branchId, departments), [branchId, departments]);
    const departmentOptions = useMemo(() => allowedDepartments.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })), [allowedDepartments]);
    useEffect(() => {
        if (!departmentId) {
            setDepartmentId(allowedDepartments[0]?.id ?? null);
            return;
        }
        if (!allowedDepartments.some((item) => item.id === departmentId)) {
            setDepartmentId(allowedDepartments[0]?.id ?? null);
        }
    }, [allowedDepartments, departmentId]);
    async function handleRegister() {
        setError(null);
        setResult(null);
        if (!subject.trim()) {
            setError("Please enter a subject for the correspondence.");
            return;
        }
        if (!branchId || !departmentId) {
            setError("Please select both a branch and a department.");
            return;
        }
        try {
            setSubmitting(true);
            const intake = await registerCorrespondenceInHost(runtimeHostAdapter, currentUser, {
                branchId,
                departmentId,
                subject: subject.trim(),
                direction
            }, systemConfig.orgCode);
            setResult(intake);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
        finally {
            setSubmitting(false);
        }
    }
    function handleReset() {
        setSubject("");
        setBranchId(currentUser.branchId);
        const defaults = filterDepartmentsForBranch(currentUser.branchId, departments);
        const defaultDepartment = defaults.some((item) => item.id === currentUser.departmentId)
            ? currentUser.departmentId
            : defaults[0]?.id ?? null;
        setDepartmentId(defaultDepartment);
        setResult(null);
        setError(null);
    }
    return (_jsx(Container, { size: "md", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs(Box, { children: [_jsxs(Group, { gap: "sm", align: "center", mb: 4, children: [_jsxs(Title, { order: 2, children: ["Register ", direction === "INCOMING" ? "Incoming" : "Outgoing", " Correspondence"] }), _jsx(Badge, { color: getDirectionBadgeColor(direction), variant: "light", size: "lg", children: "Receptionist" })] }), _jsxs(Text, { c: "dimmed", size: "sm", children: ["Logged in as ", _jsx("strong", { children: currentUser.fullName }), " (", currentUser.employeeCode, ")"] })] }), _jsx(Divider, {}), _jsxs(Card, { withBorder: true, radius: "md", p: "xl", children: [loading && (_jsx(Group, { justify: "center", py: "xl", children: _jsx(Loader, { size: "sm" }) })), _jsxs(Stack, { gap: "md", children: [_jsx(Title, { order: 4, c: "blue.8", children: "Correspondence Details" }), _jsx(Select, { label: "Direction", data: directionOptions, value: direction, onChange: (value) => setDirection(value ?? "INCOMING"), disabled: submitting }), _jsx(TextInput, { label: "Subject", placeholder: direction === "INCOMING"
                                        ? "e.g. Incoming regulatory letter from CBN"
                                        : "e.g. Outgoing response memo to branch", value: subject, onChange: (e) => setSubject(e.currentTarget.value), required: true }), _jsxs(Group, { grow: true, children: [_jsx(Select, { label: "Branch", data: branchOptions, value: branchId, onChange: setBranchId, required: true, disabled: loading || submitting }), _jsx(Select, { label: "Department", data: departmentOptions, value: departmentId, onChange: setDepartmentId, required: true, disabled: loading || submitting })] }), _jsxs(Group, { justify: "flex-end", mt: "xs", children: [_jsx(Button, { variant: "default", onClick: handleReset, disabled: submitting, children: "Clear" }), _jsx(Button, { onClick: () => void handleRegister(), color: "blue", loading: submitting, disabled: loading, children: "Register Correspondence" })] })] })] }), error && (_jsx(Alert, { color: "red", title: "Validation Error", radius: "md", children: error })), result && (_jsx(Card, { withBorder: true, radius: "md", p: "xl", bd: "1px solid green.4", children: _jsxs(Stack, { gap: "xs", children: [_jsxs(Group, { gap: "xs", mb: 4, children: [_jsx(Title, { order: 4, c: "green.8", children: "Correspondence Registered" }), _jsx(Badge, { color: "green", size: "sm", children: "Success" })] }), _jsx(DataRow, { label: "Reference Number", value: result.referenceNumber }), _jsx(DataRow, { label: "Subject", value: result.subject }), _jsx(DataRow, { label: "Recorded By", value: result.createdBy }), _jsx(Group, { justify: "flex-end", mt: "xs", children: _jsx(Button, { variant: "light", color: "blue", onClick: handleReset, children: "Register Another" }) })] }) }))] }) }));
}
