"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GetStartedGuideProps {
  memberCount: number;
  pendingInviteCount: number;
  onClose?: () => void;
}

export default function GetStartedGuide({
  memberCount,
  pendingInviteCount,
  onClose,
}: GetStartedGuideProps) {
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    {
      step: 1,
      title: "Update Your Company Profile",
      description: "Set your organization name and details.",
      done: true,
      href: "/settings",
    },
    {
      step: 2,
      title: "Invite Your Team",
      description: `Invite employees to your team. You've invited ${pendingInviteCount} so far.`,
      done: memberCount + pendingInviteCount > 1,
      href: "/settings",
    },
    {
      step: 3,
      title: "Set Up Your Materials Catalogue",
      description: "Add the products and materials your business sources and brands.",
      done: false,
      href: "/materials",
    },
    {
      step: 4,
      title: "Add Your Vendor Directory",
      description: "List your sourcing partners and branding vendors with pricing.",
      done: false,
      href: "/vendors",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progressPercent = (doneCount / steps.length) * 100;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full text-left"
      >
        <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Get Started Guide</p>
                <p className="text-xs text-muted-foreground">{doneCount} of {steps.length} complete</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </button>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Get Started in 4 Steps</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCollapsed(true);
            onClose?.();
          }}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-xs font-medium text-muted-foreground">{doneCount}/{steps.length}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-primary/10">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 rounded-lg border bg-background/50 p-3"
            >
              <div className="mt-0.5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : ""}`}>
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              {!item.done && (
                <Link href={item.href} className="btn-primary h-7 text-xs shrink-0">
                  Go
                </Link>
              )}
            </div>
          ))}
        </div>

        {doneCount === steps.length && (
          <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-center">
            <p className="text-sm font-medium text-success">All set! You&apos;re ready to start managing tasks.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
