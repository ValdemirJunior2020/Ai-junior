"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2Icon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import template from "@/utils/template";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runAi } from "@/actions/ai";
import "@toast-ui/editor/dist/toastui-editor.css";
import { Editor } from "@toast-ui/react-editor";
import toast from "react-hot-toast";
import { saveQuery } from "@/actions/ai";
import { useUser } from "@clerk/nextjs";
import { Template } from "@/utils/types";
import { useUsage } from "@/context/usage";

export default function Page({ params }: { params: { slug: string } }) {
  // state
  const [query, setQuery] = React.useState("");
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  // ref
  const editorRef = React.useRef<any>(null);
  // hooks
  const { fetchUsage, subscribed, count } = useUsage(); // context
  const { user } = useUser();
  // console.log("useUser() in slug page", user);
  const email = user?.primaryEmailAddress?.emailAddress || "";

  React.useEffect(() => {
    if (content) {
      const editorInstance = editorRef.current.getInstance();
      editorInstance.setMarkdown(content);
    }
  }, [content]);

  const t = template.find((item) => item.slug === params.slug) as Template;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await runAi(t.aiPrompt + query);
      setContent(data);
      // save to db
      await saveQuery(t, email, query, data);
      fetchUsage();
    } catch (err) {
      setContent("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const editorInstance = editorRef.current.getInstance();
    const c = editorInstance.getMarkdown(); // .getHTML()

    try {
      await navigator.clipboard.writeText(c);
      toast.success("Content copied to clipboard.");
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex justify-between mx-5 my-3">
        <Link href="/dashboard">
          <Button>
            <ArrowLeft /> <span className="ml-2">Back</span>
          </Button>
        </Link>

        <Button onClick={handleCopy}>
          <Copy /> <span className="ml-2">Copy</span>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-5">
        <div className="col-span-1 bg-slate-100 dark:bg-slate-900 rounded-md border p-5">
          <div className="flex flex-col gap-3">
            <Image src={t.icon} alt={t.name} width={50} height={50} />
            <h2 className="font-medium text-lg">{t.name}</h2>
            <p className="text-gray-500">{t.desc}</p>
          </div>

          <form className="mt-6" onSubmit={handleSubmit}>
            {t.form.map((item) => (
              <div className="my-2 flex flex-col gap-2 mb-7">
                <label className="font-bold pb-5">{item.label}</label>

                {item.field === "input" ? (
                  <Input
                    name={item.name}
                    onChange={(e) => setQuery(e.target.value)}
                    required={item.required}
                  />
                ) : (
                  <Textarea
                    name={item.name}
                    onChange={(e) => setQuery(e.target.value)}
                    required={item.required}
                  />
                )}
              </div>
            ))}

            <Button
              type="submit"
              className="w-full py-6"
              disabled={
                loading ||
                (!subscribed &&
                  count >= Number(process.env.NEXT_PUBLIC_FREE_TIER_USAGE))
              }
            >
              {loading && <Loader2Icon className="animate-spin mr-2" />}
              {subscribed ||
              count < Number(process.env.NEXT_PUBLIC_FREE_TIER_USAGE)
                ? "Generate content"
                : "Subscribe to generate content"}
            </Button>
          </form>
        </div>

        <div className="col-span-2">
          <Editor
            ref={editorRef}
            initialValue="Generated content will appear here."
            previewStyle="vertical"
            height="600px"
            initialEditType="wysiwyg"
            useCommandShortcut={true}
            // onChange={() =>
            //   setContent(editorRef.current.getInstance().getMarkdown())
            // }
          />
        </div>
      </div>
    </div>
  );
}
