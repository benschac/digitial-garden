import type { Metadata } from "next";

import { Typography } from "@/components/page-typography";
import { getBlogPosts } from "@/lib/content";

import { BlogPostList } from "./blog-post-list";
import { BlogTransition } from "./blog-transition";
import styles from "./index-styles";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  description: "Writing about software, experiments, and interaction design.",
  title: "Blog",
};

const BlogIndexPage = async () => {
  const posts = await getBlogPosts();

  return (
    <BlogTransition view="index">
      <Typography as="main" variant="ui" className={styles.page}>
        <a className={`${styles.link} ${styles.skipLink}`} href="#posts">
          Skip to articles
        </a>
        <div className={styles.shell}>
          <div className={styles.layout}>
            <div>
              <Typography
                as="h1"
                variant="journalTitle"
                className={styles.title}
              >
                Blog
              </Typography>
            </div>
            <BlogPostList posts={posts} />
          </div>
        </div>
      </Typography>
    </BlogTransition>
  );
};

export default BlogIndexPage;
